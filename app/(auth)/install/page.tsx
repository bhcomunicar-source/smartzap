'use client';

import { useReducer, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { installReducer, initialState, isCollecting, isProvisioning, isError, isSuccess } from '@/lib/installer/machine';
import { InstallData, EMPTY_INSTALL_DATA, InstallStep, ProvisionStreamEvent } from '@/lib/installer/types';
import { InstallLayout } from '@/components/install/InstallLayout';
import { StepCard } from '@/components/install/StepCard';
import {
  IdentityForm,
  VercelForm,
  SupabaseForm,
  QStashForm,
  RedisForm,
} from '@/components/install/forms';
import { ProvisioningView } from '@/components/install/ProvisioningView';
import { SuccessView } from '@/components/install/SuccessView';
import { ErrorView } from '@/components/install/ErrorView';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

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

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function InstallPage() {
  const [state, dispatch] = useReducer(installReducer, initialState);
  const [data, setData] = useState<InstallData>(EMPTY_INSTALL_DATA);
  const [direction, setDirection] = useState(1);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleStepComplete = useCallback((stepData: Partial<InstallData>) => {
    setData((prev) => ({ ...prev, ...stepData }));
    setDirection(1);
    dispatch({ type: 'NEXT' });
  }, []);

  const handleBack = useCallback(() => {
    setDirection(-1);
    dispatch({ type: 'BACK' });
  }, []);

  const handleProvisionProgress = useCallback((event: ProvisionStreamEvent) => {
    if (event.type === 'progress') {
      dispatch({
        type: 'PROGRESS',
        progress: event.progress ?? 0,
        title: event.title ?? '',
        subtitle: event.subtitle ?? '',
      });
    } else if (event.type === 'error') {
      dispatch({
        type: 'ERROR',
        returnToStep: event.returnToStep ?? 1,
        error: event.error ?? 'Erro desconhecido',
        errorDetails: event.errorDetails,
      });
    } else if (event.type === 'complete') {
      dispatch({ type: 'COMPLETE' });
    }
  }, []);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RETRY' });
  }, []);

  const handleGoToStep = useCallback((step: InstallStep) => {
    setDirection(step > (isCollecting(state) ? state.step : 1) ? 1 : -1);
    dispatch({ type: 'GO_TO_STEP', step });
  }, [state]);

  // ---------------------------------------------------------------------------
  // RENDER: COLLECTING PHASE
  // ---------------------------------------------------------------------------

  if (isCollecting(state)) {
    const { step } = state;

    const glowColors: Record<InstallStep, 'emerald' | 'blue' | 'orange' | 'red'> = {
      1: 'emerald',
      2: 'blue',
      3: 'emerald',
      4: 'orange',
      5: 'red',
    };

    const renderForm = () => {
      const formProps = {
        data,
        onComplete: handleStepComplete,
        onBack: handleBack,
        showBack: step > 1,
      };

      switch (step) {
        case 1:
          return <IdentityForm key="identity" {...formProps} />;
        case 2:
          return <VercelForm key="vercel" {...formProps} />;
        case 3:
          return <SupabaseForm key="supabase" {...formProps} />;
        case 4:
          return <QStashForm key="qstash" {...formProps} />;
        case 5:
          return <RedisForm key="redis" {...formProps} />;
        default:
          return null;
      }
    };

    return (
      <InstallLayout currentStep={step} totalSteps={5}>
        {/* Back button */}
        {step > 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleBack}
            className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-200 transition-colors z-20"
          >
            ← Voltar
          </motion.button>
        )}

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
            <StepCard glowColor={glowColors[step]}>
              {renderForm()}
            </StepCard>
          </motion.div>
        </AnimatePresence>
      </InstallLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: PROVISIONING PHASE
  // ---------------------------------------------------------------------------

  if (isProvisioning(state)) {
    return (
      <InstallLayout showDots={false}>
        <ProvisioningView
          data={data}
          progress={state.progress}
          title={state.title}
          subtitle={state.subtitle}
          onProgress={handleProvisionProgress}
        />
      </InstallLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR PHASE
  // ---------------------------------------------------------------------------

  if (isError(state)) {
    return (
      <InstallLayout showDots={false}>
        <ErrorView
          error={state.error}
          errorDetails={state.errorDetails}
          onRetry={handleRetry}
          onGoToStep={handleGoToStep}
          returnToStep={state.returnToStep}
        />
      </InstallLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: SUCCESS PHASE
  // ---------------------------------------------------------------------------

  if (isSuccess(state)) {
    return (
      <InstallLayout showDots={false}>
        <SuccessView name={data.name} />
      </InstallLayout>
    );
  }

  // Fallback (should never happen)
  return null;
}
