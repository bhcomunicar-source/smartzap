'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna } from 'lucide-react';
import { StepCard } from './StepCard';
import { cn } from '@/lib/utils';
import type { InstallData, ProvisionStreamEvent, ProvisionPayload } from '@/lib/installer/types';

interface ProvisioningViewProps {
  data: InstallData;
  progress: number;
  title: string;
  subtitle: string;
  onProgress: (event: ProvisionStreamEvent) => void;
  onReset?: () => void;
}

/**
 * View de provisionamento com streaming SSE.
 * Tema Blade Runner - "Câmara de Incubação"
 */
export function ProvisioningView({ data, progress, title, subtitle, onProgress, onReset }: ProvisioningViewProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);

  const startProvisioning = useCallback(async () => {
    console.log('[Provisioning] 🚀 startProvisioning chamado');

    if (hasStartedRef.current) {
      console.log('[Provisioning] ⚠️ Já iniciado, ignorando');
      return;
    }
    hasStartedRef.current = true;
    console.log('[Provisioning] ✅ Marcado como iniciado');

    abortControllerRef.current = new AbortController();

    const payload: ProvisionPayload = {
      identity: {
        name: data.name,
        email: data.email,
        password: data.password,
      },
      vercel: {
        token: data.vercelToken,
      },
      supabase: {
        pat: data.supabasePat,
      },
      qstash: {
        token: data.qstashToken,
      },
      redis: {
        restUrl: data.redisRestUrl,
        restToken: data.redisRestToken,
      },
    };

    try {
      console.log('[Provisioning] 📤 Enviando request para /api/installer/provision');
      console.log('[Provisioning] 📦 Payload:', {
        ...payload,
        identity: { ...payload.identity, password: '***' },
        vercel: { token: payload.vercel.token.slice(0, 10) + '...' },
        supabase: { pat: payload.supabase.pat.slice(0, 10) + '...' },
      });

      const response = await fetch('/api/installer/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      console.log('[Provisioning] 📥 Response recebido:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('[Provisioning] ❌ Response não ok:', errorData);
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        console.log('[Provisioning] ❌ Reader não disponível');
        throw new Error('Stream não disponível');
      }
      console.log('[Provisioning] ✅ Reader obtido, iniciando leitura do stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let eventCount = 0;

      console.log('[Provisioning] 🔄 Iniciando loop de leitura do stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[Provisioning] ✅ Stream finalizado após', eventCount, 'eventos');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: ProvisionStreamEvent = JSON.parse(line.slice(6));
              eventCount++;
              console.log(`[Provisioning] 📨 Evento #${eventCount}:`, event.type, event);
              onProgress(event);
            } catch (parseErr) {
              console.warn('[Provisioning] ⚠️ Erro ao parsear evento SSE:', {
                line: line.slice(0, 100),
                error: parseErr instanceof Error ? parseErr.message : 'Erro desconhecido',
              });
            }
          }
        }
      }
    } catch (err) {
      console.log('[Provisioning] ❌ Erro no stream:', err);
      if ((err as Error).name === 'AbortError') {
        console.log('[Provisioning] ⚠️ Request abortado');
        return;
      }

      onProgress({
        type: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        returnToStep: 1,
      });
    }
  }, [data, onProgress]);

  useEffect(() => {
    startProvisioning();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepCard glowColor="cyan">
      <div className="flex flex-col items-center text-center py-8">
        {/* Animated DNA icon - Incubation chamber */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {/* Outer rotating ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-20 h-20 rounded-full border-2 border-[var(--br-neon-cyan)]/20 border-t-[var(--br-neon-cyan)]"
          />
          {/* Inner rotating ring (opposite direction) */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 w-16 h-16 rounded-full border-2 border-[var(--br-neon-magenta)]/20 border-b-[var(--br-neon-magenta)]"
          />
          {/* Center icon */}
          <div className="w-20 h-20 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              <Dna className="w-8 h-8 text-[var(--br-neon-cyan)]" />
            </motion.div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-[var(--br-neon-cyan)]/10 blur-xl" />
        </motion.div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 text-xl font-mono font-bold text-[var(--br-hologram-white)] uppercase tracking-wide"
          >
            {title}
          </motion.h2>
        </AnimatePresence>

        {/* Subtitle */}
        <AnimatePresence mode="wait">
          <motion.p
            key={subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm font-mono text-[var(--br-muted-cyan)] h-5"
          >
            {subtitle}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar - Blade Runner style */}
        <div className="w-full mt-8">
          <div className="h-2 bg-[var(--br-dust-gray)]/30 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                'bg-gradient-to-r from-[var(--br-neon-cyan)] via-[var(--br-neon-magenta)] to-[var(--br-neon-cyan)]',
                'bg-[length:200%_100%]'
              )}
              initial={{ width: '0%' }}
              animate={{
                width: `${progress}%`,
                backgroundPosition: ['0% 0%', '100% 0%'],
              }}
              transition={{
                width: { duration: 0.5, ease: 'easeOut' },
                backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs font-mono text-[var(--br-dust-gray)]">
            <span>INCUBAÇÃO</span>
            <span className="text-[var(--br-neon-cyan)]">{progress}%</span>
          </div>
        </div>

        {/* Warning text */}
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-6 text-xs font-mono text-[var(--br-neon-orange)]"
        >
          ! NÃO INTERROMPA O PROCESSO DE INCUBAÇÃO
        </motion.p>
      </div>
    </StepCard>
  );
}
