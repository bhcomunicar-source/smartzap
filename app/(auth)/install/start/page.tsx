'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  InstallLayout,
  IdentityStep,
  VercelStep,
  SupabaseStep,
  QStashStep,
  RedisStep,
} from '@/components/install';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  // Identity
  USER_NAME: 'smartzap_install_name',
  USER_EMAIL: 'smartzap_install_email',
  USER_PASS_HASH: 'smartzap_install_pass_hash',
  USER_PASS_PLAIN: 'smartzap_install_pass', // sessionStorage only

  // Vercel
  VERCEL_TOKEN: 'smartzap_install_vercel_token',
  VERCEL_PROJECT: 'smartzap_install_vercel_project',

  // Supabase
  SUPABASE_PAT: 'smartzap_install_supabase_pat',
  SUPABASE_URL: 'smartzap_install_supabase_url',
  SUPABASE_REF: 'smartzap_install_supabase_ref',
  SUPABASE_PUBLISHABLE_KEY: 'smartzap_install_supabase_publishable_key',
  SUPABASE_SECRET_KEY: 'smartzap_install_supabase_secret_key',
  SUPABASE_DB_PASS: 'smartzap_install_supabase_db_pass',

  // QStash
  QSTASH_TOKEN: 'smartzap_install_qstash_token',

  // Redis
  REDIS_REST_URL: 'smartzap_install_redis_url',
  REDIS_REST_TOKEN: 'smartzap_install_redis_token',
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface WizardState {
  // Identity
  name: string;
  email: string;
  passwordHash: string;

  // Vercel
  vercelToken: string;
  vercelProject: {
    id: string;
    name: string;
    teamId?: string;
  } | null;

  // Supabase
  supabasePat: string;
  supabaseUrl: string;
  supabaseRef: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  supabaseDbPass: string;

  // QStash
  qstashToken: string;

  // Redis
  redisRestUrl: string;
  redisRestToken: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function InstallStartPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);

  const [state, setState] = useState<WizardState>({
    name: '',
    email: '',
    passwordHash: '',
    vercelToken: '',
    vercelProject: null,
    supabasePat: '',
    supabaseUrl: '',
    supabaseRef: '',
    supabasePublishableKey: '',
    supabaseSecretKey: '',
    supabaseDbPass: '',
    qstashToken: '',
    redisRestUrl: '',
    redisRestToken: '',
  });

  // --------------------------------------------------------------------------
  // Hydration: Load saved state from localStorage
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Check if all required data exists → redirect to wizard
    const vercelToken = localStorage.getItem(STORAGE_KEYS.VERCEL_TOKEN);
    const vercelProject = localStorage.getItem(STORAGE_KEYS.VERCEL_PROJECT);
    const supabasePat = localStorage.getItem(STORAGE_KEYS.SUPABASE_PAT);
    const supabaseUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const supabaseRef = localStorage.getItem(STORAGE_KEYS.SUPABASE_REF);
    const supabasePublishableKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_PUBLISHABLE_KEY);
    const supabaseSecretKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_SECRET_KEY);
    const supabaseDbPass = localStorage.getItem(STORAGE_KEYS.SUPABASE_DB_PASS);
    const qstashToken = localStorage.getItem(STORAGE_KEYS.QSTASH_TOKEN);
    const redisUrl = localStorage.getItem(STORAGE_KEYS.REDIS_REST_URL);
    const redisToken = localStorage.getItem(STORAGE_KEYS.REDIS_REST_TOKEN);

    // All tokens present → go to wizard
    if (
      vercelToken &&
      vercelProject &&
      supabasePat &&
      supabaseUrl &&
      supabasePublishableKey &&
      supabaseSecretKey &&
      supabaseDbPass &&
      qstashToken &&
      redisUrl &&
      redisToken
    ) {
      router.replace('/install/wizard');
      return;
    }

    // Load partial state
    const name = localStorage.getItem(STORAGE_KEYS.USER_NAME) || '';
    const email = localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || '';
    const passwordHash = localStorage.getItem(STORAGE_KEYS.USER_PASS_HASH) || '';

    setState((prev) => ({
      ...prev,
      name,
      email,
      passwordHash,
      vercelToken: vercelToken || '',
      vercelProject: vercelProject ? JSON.parse(vercelProject) : null,
      supabasePat: supabasePat || '',
      supabaseUrl: supabaseUrl || '',
      supabaseRef: supabaseRef || '',
      supabasePublishableKey: supabasePublishableKey || '',
      supabaseSecretKey: supabaseSecretKey || '',
      supabaseDbPass: supabaseDbPass || '',
      qstashToken: qstashToken || '',
      redisRestUrl: redisUrl || '',
      redisRestToken: redisToken || '',
    }));

    // Determine starting step based on saved progress
    // Note: Removido o check "if redisUrl && redisToken → wizard" porque causava loop
    // Agora o único redirecionamento para /wizard é se TODOS os tokens existirem (verificado acima)
    if (qstashToken) {
      setStep(5); // Redis
    } else if (supabasePat && supabaseUrl && supabasePublishableKey) {
      setStep(4); // QStash
    } else if (vercelToken && vercelProject) {
      setStep(3); // Supabase
    } else if (name && email && passwordHash) {
      setStep(2); // Vercel
    }

    setIsHydrated(true);
  }, [router]);

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------
  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 5) as Step);
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1) as Step);
  }, []);

  // --------------------------------------------------------------------------
  // Step Handlers
  // --------------------------------------------------------------------------
  const handleIdentityComplete = useCallback(
    (data: { name: string; email: string; password: string; passwordHash: string }) => {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.USER_NAME, data.name);
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, data.email);
      localStorage.setItem(STORAGE_KEYS.USER_PASS_HASH, data.passwordHash);

      // Save plaintext to sessionStorage (needed for Supabase Auth later)
      sessionStorage.setItem(STORAGE_KEYS.USER_PASS_PLAIN, data.password);

      setState((prev) => ({
        ...prev,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      }));

      goNext();
    },
    [goNext]
  );

  const handleVercelComplete = useCallback(
    (data: { token: string; project: { id: string; name: string; teamId?: string } }) => {
      localStorage.setItem(STORAGE_KEYS.VERCEL_TOKEN, data.token);
      localStorage.setItem(STORAGE_KEYS.VERCEL_PROJECT, JSON.stringify(data.project));

      setState((prev) => ({
        ...prev,
        vercelToken: data.token,
        vercelProject: data.project,
      }));

      goNext();
    },
    [goNext]
  );

  const handleSupabaseComplete = useCallback(
    (data: {
      pat: string;
      projectUrl: string;
      projectRef: string;
      publishableKey: string;
      secretKey: string;
      dbPass: string;
    }) => {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_PAT, data.pat);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, data.projectUrl);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_REF, data.projectRef);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_PUBLISHABLE_KEY, data.publishableKey);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_SECRET_KEY, data.secretKey);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_DB_PASS, data.dbPass);

      setState((prev) => ({
        ...prev,
        supabasePat: data.pat,
        supabaseUrl: data.projectUrl,
        supabaseRef: data.projectRef,
        supabasePublishableKey: data.publishableKey,
        supabaseSecretKey: data.secretKey,
        supabaseDbPass: data.dbPass,
      }));

      goNext();
    },
    [goNext]
  );

  const handleQStashComplete = useCallback(
    (data: { token: string }) => {
      localStorage.setItem(STORAGE_KEYS.QSTASH_TOKEN, data.token);

      setState((prev) => ({
        ...prev,
        qstashToken: data.token,
      }));

      goNext();
    },
    [goNext]
  );

  const handleRedisComplete = useCallback(
    (data: { restUrl: string; restToken: string }) => {
      console.log('[InstallStart] handleRedisComplete chamado:', data);

      localStorage.setItem(STORAGE_KEYS.REDIS_REST_URL, data.restUrl);
      localStorage.setItem(STORAGE_KEYS.REDIS_REST_TOKEN, data.restToken);
      console.log('[InstallStart] Dados salvos no localStorage');

      setState((prev) => ({
        ...prev,
        redisRestUrl: data.restUrl,
        redisRestToken: data.restToken,
      }));

      // All done! Redirect to wizard
      console.log('[InstallStart] Redirecionando para /install/wizard...');
      router.push('/install/wizard');
    },
    [router]
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  if (!isHydrated) {
    return (
      <InstallLayout showDots={false}>
        <div className="flex items-center justify-center py-20">
          <motion.div
            className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </InstallLayout>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <IdentityStep
            key="identity"
            onComplete={handleIdentityComplete}
            initialName={state.name}
            initialEmail={state.email}
          />
        );
      case 2:
        return (
          <VercelStep
            key="vercel"
            onComplete={handleVercelComplete}
          />
        );
      case 3:
        return (
          <SupabaseStep
            key="supabase"
            onComplete={handleSupabaseComplete}
          />
        );
      case 4:
        return (
          <QStashStep
            key="qstash"
            onComplete={handleQStashComplete}
          />
        );
      case 5:
        return (
          <RedisStep
            key="redis"
            onComplete={handleRedisComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <InstallLayout currentStep={step} totalSteps={5}>
      {/* Back button (except on step 1) */}
      {step > 1 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={goBack}
          className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-200 transition-colors z-20"
        >
          ← Voltar
        </motion.button>
      )}

      {/* Step content with transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </InstallLayout>
  );
}
