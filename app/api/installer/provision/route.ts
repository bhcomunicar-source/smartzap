/**
 * API de Provisioning Unificada
 *
 * Esta é a ÚNICA API de provisioning do SmartZap.
 * Recebe todos os dados coletados e executa o setup completo.
 *
 * Steps:
 * 1. Validar Vercel token + detectar projeto
 * 2. Validar Supabase PAT + listar orgs
 * 3. Criar projeto Supabase (ou detectar existente)
 * 4. Aguardar projeto ACTIVE
 * 5. Resolver keys (anon, service_role)
 * 6. Validar QStash token
 * 7. Validar Redis credentials
 * 8. Configurar env vars no Vercel
 * 9. Rodar migrations
 * 10. Bootstrap admin
 * 11. Trigger redeploy
 * 12. Aguardar deploy ready
 */

import { z } from 'zod';
import { runSchemaMigration, checkSchemaApplied } from '@/lib/installer/migrations';
import { bootstrapInstance } from '@/lib/installer/bootstrap';
import { triggerProjectRedeploy, upsertProjectEnvs, waitForVercelDeploymentReady } from '@/lib/installer/vercel';
import {
  resolveSupabaseApiKeys,
  resolveSupabaseDbUrl,
  waitForSupabaseProjectReady,
  listSupabaseProjects,
  createSupabaseProject,
} from '@/lib/installer/supabase';
import type { InstallStep } from '@/lib/installer/types';

export const maxDuration = 300;
export const runtime = 'nodejs';

// =============================================================================
// SCHEMA
// =============================================================================

const ProvisionSchema = z.object({
  identity: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
  vercel: z.object({
    token: z.string().min(24),
  }),
  supabase: z.object({
    pat: z.string().min(40),
  }),
  qstash: z.object({
    token: z.string().min(30),
  }),
  redis: z.object({
    restUrl: z.string().url(),
    restToken: z.string().min(30),
  }),
});

// =============================================================================
// TYPES
// =============================================================================

interface StreamEvent {
  type: 'progress' | 'error' | 'complete';
  progress?: number;
  title?: string;
  subtitle?: string;
  error?: string;
  errorDetails?: string;
  returnToStep?: InstallStep;
}

interface Step {
  id: string;
  title: string;
  subtitle: string;
  weight: number;
  returnToStep: InstallStep;
}

const STEPS: Step[] = [
  { id: 'validate_vercel', title: 'Conectando Link Neural...', subtitle: 'Autenticando com servidor de deploy', weight: 5, returnToStep: 2 },
  { id: 'validate_supabase', title: 'Escaneando Memória Base...', subtitle: 'Verificando credenciais Supabase', weight: 5, returnToStep: 3 },
  { id: 'create_project', title: 'Criando Unidade...', subtitle: 'Alocando nova instância de memória', weight: 10, returnToStep: 3 },
  { id: 'wait_project', title: 'Incubando Unidade...', subtitle: 'Aguardando células se multiplicarem', weight: 15, returnToStep: 3 },
  { id: 'resolve_keys', title: 'Extraindo DNA...', subtitle: 'Resolvendo chaves de acesso', weight: 5, returnToStep: 3 },
  { id: 'validate_qstash', title: 'Calibrando Transmissão...', subtitle: 'Verificando canal de mensagens', weight: 5, returnToStep: 4 },
  { id: 'validate_redis', title: 'Inicializando Cache...', subtitle: 'Testando memória temporária', weight: 5, returnToStep: 5 },
  { id: 'setup_envs', title: 'Implantando Memórias...', subtitle: 'Configurando variáveis de ambiente', weight: 10, returnToStep: 2 },
  { id: 'migrations', title: 'Estruturando Sinapses...', subtitle: 'Criando conexões neurais do banco', weight: 15, returnToStep: 3 },
  { id: 'bootstrap', title: 'Registrando Baseline...', subtitle: 'Criando identidade administrativa', weight: 10, returnToStep: 1 },
  { id: 'redeploy', title: 'Ativando Replicante...', subtitle: 'Fazendo deploy das configurações', weight: 10, returnToStep: 2 },
  { id: 'wait_deploy', title: 'Despertar Iminente...', subtitle: 'Finalizando processo de incubação', weight: 5, returnToStep: 2 },
];

// =============================================================================
// HELPERS
// =============================================================================

async function hashPassword(password: string): Promise<string> {
  const SALT = '_smartzap_salt_2026';
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function calculateProgress(completedSteps: number, currentStepProgress = 0): number {
  const totalWeight = STEPS.reduce((sum, s) => sum + s.weight, 0);
  const completedWeight = STEPS.slice(0, completedSteps).reduce((sum, s) => sum + s.weight, 0);
  const currentStep = STEPS[completedSteps];
  const currentWeight = currentStep ? currentStep.weight * currentStepProgress : 0;
  return Math.min(Math.round(((completedWeight + currentWeight) / totalWeight) * 100), 99);
}

async function validateVercelToken(token: string): Promise<{ projectId: string; projectName: string; teamId?: string }> {
  // List projects to validate token and find smartzap project
  const res = await fetch('https://api.vercel.com/v9/projects?limit=100', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Token Vercel inválido');
  }

  const data = await res.json();
  const projects = data.projects || [];

  // Find smartzap project or use first
  let project = projects.find((p: { name: string }) => p.name.toLowerCase().includes('smartzap'));
  if (!project && projects.length > 0) {
    project = projects[0];
  }

  if (!project) {
    throw new Error('Nenhum projeto encontrado na Vercel. Crie um projeto primeiro.');
  }

  return {
    projectId: project.id,
    projectName: project.name,
    teamId: project.accountId !== project.ownerId ? project.accountId : undefined,
  };
}

async function validateQStashToken(token: string): Promise<void> {
  const res = await fetch('https://qstash.upstash.io/v2/schedules', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Token QStash inválido');
  }
}

async function validateRedisCredentials(url: string, token: string): Promise<void> {
  const res = await fetch(`${url}/ping`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Credenciais Redis inválidas');
  }
}

async function findOrCreateSupabaseProject(
  pat: string,
  onProgress: (fraction: number) => Promise<void>
): Promise<{ projectRef: string; projectUrl: string; dbPass: string; isNew: boolean }> {
  // SEMPRE cria um projeto novo para evitar herdar lixo de instalações anteriores
  // Se "smartzap" já existe, tenta smartzap-v2, smartzap-v3, etc.

  await onProgress(0.1);

  // List existing projects to find available name
  const projectsResult = await listSupabaseProjects({ accessToken: pat });
  const existingNames = new Set(
    projectsResult.ok
      ? projectsResult.projects.map((p) => p.name?.toLowerCase())
      : []
  );

  await onProgress(0.2);

  // Generate DB password
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const dbPass = Array.from(array, (b) => charset[b % charset.length]).join('');

  // Get first org
  const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
    headers: { Authorization: `Bearer ${pat}` },
  });

  if (!orgsRes.ok) {
    throw new Error('Falha ao listar organizações Supabase');
  }

  const orgs = await orgsRes.json();
  if (!orgs.length) {
    throw new Error('Nenhuma organização Supabase encontrada');
  }

  const org = orgs[0];
  await onProgress(0.3);

  // Find available project name (smartzap, smartzap-v2, smartzap-v3, ...)
  let projectName = 'smartzap';
  let version = 1;

  while (existingNames.has(projectName.toLowerCase()) && version < 100) {
    version++;
    projectName = `smartzap-v${version}`;
  }

  await onProgress(0.4);

  // Create project
  const createResult = await createSupabaseProject({
    accessToken: pat,
    organizationSlug: org.slug || org.id,
    name: projectName,
    dbPass,
    regionSmartGroup: 'americas', // São Paulo
  });

  if (!createResult.ok) {
    // Handle race condition where name was taken between check and create
    if (createResult.status === 409) {
      // Try with timestamp suffix as fallback
      const fallbackName = `smartzap-${Date.now().toString(36)}`;
      const retryResult = await createSupabaseProject({
        accessToken: pat,
        organizationSlug: org.slug || org.id,
        name: fallbackName,
        dbPass,
        regionSmartGroup: 'americas',
      });

      if (!retryResult.ok) {
        throw new Error(retryResult.error || 'Falha ao criar projeto Supabase');
      }

      await onProgress(1);
      return {
        projectRef: retryResult.projectRef,
        projectUrl: `https://${retryResult.projectRef}.supabase.co`,
        dbPass,
        isNew: true,
      };
    }

    throw new Error(createResult.error || 'Falha ao criar projeto Supabase');
  }

  await onProgress(1);

  return {
    projectRef: createResult.projectRef,
    projectUrl: `https://${createResult.projectRef}.supabase.co`,
    dbPass,
    isNew: true,
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
  console.log('[provision] 🚀 POST /api/installer/provision iniciado');

  // Check if installer is enabled
  if (process.env.INSTALLER_ENABLED === 'false') {
    console.log('[provision] ❌ Installer desabilitado');
    return new Response(JSON.stringify({ error: 'Installer desabilitado' }), { status: 403 });
  }

  // Parse and validate payload
  console.log('[provision] 📦 Parseando payload...');
  const raw = await req.json().catch((e) => {
    console.log('[provision] ❌ Erro ao parsear JSON:', e);
    return null;
  });

  const parsed = ProvisionSchema.safeParse(raw);

  if (!parsed.success) {
    console.log('[provision] ❌ Payload inválido:', parsed.error.flatten());
    return new Response(
      JSON.stringify({ error: 'Payload inválido', details: parsed.error.flatten() }),
      { status: 400 }
    );
  }

  console.log('[provision] ✅ Payload válido');
  const { identity, vercel, supabase, qstash, redis } = parsed.data;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: StreamEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  console.log('[provision] 🔄 Iniciando stream SSE...');

  // Run provisioning in background
  (async () => {
    console.log('[provision] ⚡ Background task iniciada');

    let stepIndex = 0;
    let vercelProject: { projectId: string; projectName: string; teamId?: string } | null = null;
    let supabaseProject: { projectRef: string; projectUrl: string; dbPass: string; isNew: boolean } | null = null;
    let anonKey = '';
    let serviceRoleKey = '';
    let dbUrl = '';

    try {
      // Step 1: Validate Vercel token
      console.log('[provision] 📍 Step 1: Validate Vercel');
      const step1 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step1.title,
        subtitle: step1.subtitle,
      });

      vercelProject = await validateVercelToken(vercel.token);
      stepIndex++;

      // Step 2: Validate Supabase PAT
      const step2 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step2.title,
        subtitle: step2.subtitle,
      });

      // Just validate the PAT format for now - actual validation happens in project creation
      if (!supabase.pat.startsWith('sbp_')) {
        throw new Error('PAT Supabase inválido (deve começar com sbp_)');
      }
      stepIndex++;

      // Step 3: Create/find Supabase project
      const step3 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step3.title,
        subtitle: step3.subtitle,
      });

      supabaseProject = await findOrCreateSupabaseProject(supabase.pat, async (fraction) => {
        await sendEvent({
          type: 'progress',
          progress: calculateProgress(stepIndex, fraction),
          title: step3.title,
          subtitle: fraction < 0.3 ? 'Escaneando setores ocupados...' : 'Alocando nova unidade de memória...',
        });
      });
      stepIndex++;

      // Step 4: Wait for project to be ready (sempre aguarda - projeto é sempre novo)
      const step4 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step4.title,
        subtitle: step4.subtitle,
      });

      const startTime = Date.now();
      const timeoutMs = 210_000;

      while (Date.now() - startTime < timeoutMs) {
        const ready = await waitForSupabaseProjectReady({
          accessToken: supabase.pat,
          projectRef: supabaseProject.projectRef,
          timeoutMs: 4_000,
          pollMs: 4_000,
        });

        if (ready.ok) break;

        const fraction = Math.min((Date.now() - startTime) / timeoutMs, 0.95);
        await sendEvent({
          type: 'progress',
          progress: calculateProgress(stepIndex, fraction),
          title: step4.title,
          subtitle: `Células se multiplicando... (${Math.round(fraction * 100)}%)`,
        });
      }
      stepIndex++;

      // Step 5: Resolve Supabase keys
      const step5 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step5.title,
        subtitle: step5.subtitle,
      });

      const keysResult = await resolveSupabaseApiKeys({
        projectRef: supabaseProject.projectRef,
        accessToken: supabase.pat,
      });

      if (!keysResult.ok) {
        throw new Error(keysResult.error || 'Falha ao obter chaves do Supabase');
      }

      anonKey = keysResult.publishableKey;
      serviceRoleKey = keysResult.secretKey;

      // Resolve DB URL
      if (supabaseProject.dbPass) {
        const poolerResult = await resolveSupabaseDbUrl({
          projectRef: supabaseProject.projectRef,
          accessToken: supabase.pat,
        });

        if (poolerResult.ok) {
          const poolerHost = poolerResult.host;
          dbUrl = `postgresql://postgres.${supabaseProject.projectRef}:${encodeURIComponent(supabaseProject.dbPass)}@${poolerHost}:6543/postgres?sslmode=require&pgbouncer=true`;
        }
      }

      stepIndex++;

      // Step 6: Validate QStash
      const step6 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step6.title,
        subtitle: step6.subtitle,
      });

      await validateQStashToken(qstash.token);
      stepIndex++;

      // Step 7: Validate Redis
      const step7 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step7.title,
        subtitle: step7.subtitle,
      });

      await validateRedisCredentials(redis.restUrl, redis.restToken);
      stepIndex++;

      // Step 8: Setup env vars
      const step8 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step8.title,
        subtitle: step8.subtitle,
      });

      const passwordHash = await hashPassword(identity.password);
      const envTargets = ['production', 'preview'] as const;

      const envVars = [
        { key: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseProject.projectUrl, targets: [...envTargets] },
        { key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', value: anonKey, targets: [...envTargets] },
        { key: 'SUPABASE_SECRET_KEY', value: serviceRoleKey, targets: [...envTargets] },
        { key: 'QSTASH_TOKEN', value: qstash.token, targets: [...envTargets] },
        { key: 'UPSTASH_REDIS_REST_URL', value: redis.restUrl, targets: [...envTargets] },
        { key: 'UPSTASH_REDIS_REST_TOKEN', value: redis.restToken, targets: [...envTargets] },
        { key: 'MASTER_PASSWORD', value: passwordHash, targets: [...envTargets] },
        { key: 'SETUP_COMPLETE', value: 'true', targets: [...envTargets] },
      ];

      await upsertProjectEnvs(vercel.token, vercelProject.projectId, envVars, vercelProject.teamId);
      stepIndex++;

      // Step 9: Run migrations
      const step9 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step9.title,
        subtitle: step9.subtitle,
      });

      if (dbUrl) {
        const schemaExists = await checkSchemaApplied(dbUrl);
        if (!schemaExists) {
          await runSchemaMigration(dbUrl);
          // Wait for schema cache to update
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      stepIndex++;

      // Step 10: Bootstrap admin
      const step10 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step10.title,
        subtitle: step10.subtitle,
      });

      await bootstrapInstance({
        supabaseUrl: supabaseProject.projectUrl,
        serviceRoleKey,
        adminEmail: identity.email,
        adminName: identity.name,
      });
      stepIndex++;

      // Step 11: Redeploy
      const step11 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step11.title,
        subtitle: step11.subtitle,
      });

      // Disable installer before redeploy
      await upsertProjectEnvs(
        vercel.token,
        vercelProject.projectId,
        [{ key: 'INSTALLER_ENABLED', value: 'false', targets: ['production', 'preview'] }],
        vercelProject.teamId
      );

      const redeploy = await triggerProjectRedeploy(vercel.token, vercelProject.projectId, vercelProject.teamId);
      stepIndex++;

      // Step 12: Wait for deploy
      const step12 = STEPS[stepIndex];
      await sendEvent({
        type: 'progress',
        progress: calculateProgress(stepIndex),
        title: step12.title,
        subtitle: step12.subtitle,
      });

      if (redeploy.deploymentId) {
        await waitForVercelDeploymentReady({
          token: vercel.token,
          deploymentId: redeploy.deploymentId,
          teamId: vercelProject.teamId,
          timeoutMs: 240_000,
          pollMs: 2_500,
          onTick: async ({ elapsedMs }) => {
            const fraction = Math.min(elapsedMs / 240_000, 0.95);
            await sendEvent({
              type: 'progress',
              progress: calculateProgress(stepIndex, fraction),
              title: step12.title,
              subtitle: `Consciência emergindo... (${Math.round(fraction * 100)}%)`,
            });
          },
        });
      }

      // Complete!
      await sendEvent({ type: 'complete' });
    } catch (err) {
      const currentStep = STEPS[stepIndex] || STEPS[0];
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      const stack = err instanceof Error ? err.stack : undefined;

      console.error(`[provision] Error at step ${currentStep.id}:`, message);
      if (stack) console.error('[provision] Stack:', stack);

      await sendEvent({
        type: 'error',
        error: message,
        errorDetails: stack,
        returnToStep: currentStep.returnToStep,
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
