'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type OnboardingStep =
  | 'welcome'             // Escolha do caminho
  | 'requirements'        // Passo 1 - requisitos
  | 'create-app'          // Passo 2 - criar app Meta
  | 'add-whatsapp'        // Passo 3 - adicionar WhatsApp
  | 'credentials'         // Passo 4 - copiar credenciais
  | 'test-connection'     // Passo 5 - testar
  | 'configure-webhook'   // Passo 6 - configurar webhook
  | 'sync-templates'      // Passo 7 - sincronizar templates
  | 'send-first-message'  // Passo 8 - enviar mensagem de teste
  | 'create-permanent-token' // Passo 9 - token permanente (opcional)
  | 'direct-credentials'  // Caminho B - input direto
  | 'complete';           // Concluído

export type OnboardingPath = 'guided' | 'direct' | null;

export interface OnboardingProgress {
  // Estado do wizard
  currentStep: OnboardingStep;
  path: OnboardingPath;
  completedSteps: OnboardingStep[];

  // UI state do checklist
  isChecklistMinimized: boolean;
  isChecklistDismissed: boolean;

  // Timestamps
  startedAt: string | null;
  completedAt: string | null;
}

const STORAGE_KEY = 'smartzap_onboarding_progress';

const DEFAULT_PROGRESS: OnboardingProgress = {
  currentStep: 'welcome',
  path: null,
  completedSteps: [],
  isChecklistMinimized: false,
  isChecklistDismissed: false,
  startedAt: null,
  completedAt: null,
};

// ============================================================================
// Hook
// ============================================================================

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress>(DEFAULT_PROGRESS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OnboardingProgress;
        // Migração: remove campos antigos se existirem
        const { checklistItems, ...cleanProgress } = parsed as OnboardingProgress & { checklistItems?: unknown };
        setProgress(cleanProgress as OnboardingProgress);
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (error) {
        console.error('Failed to save onboarding progress:', error);
      }
    }
  }, [progress, isLoaded]);

  // ============================================================================
  // Actions
  // ============================================================================

  const startOnboarding = useCallback((path: OnboardingPath) => {
    setProgress(prev => ({
      ...prev,
      path,
      currentStep: path === 'guided' ? 'requirements' : 'direct-credentials',
      startedAt: prev.startedAt || new Date().toISOString(),
    }));
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setProgress(prev => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const completeStep = useCallback((step: OnboardingStep) => {
    setProgress(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }));
  }, []);

  const nextStep = useCallback(() => {
    setProgress(prev => {
      const guidedSteps: OnboardingStep[] = [
        'requirements',
        'create-app',
        'add-whatsapp',
        'credentials',
        'test-connection',
        'configure-webhook',
        'sync-templates',
        'send-first-message',
        'create-permanent-token',
        'complete',
      ];

      // Marcar step atual como completo
      const updatedCompleted = prev.completedSteps.includes(prev.currentStep)
        ? prev.completedSteps
        : [...prev.completedSteps, prev.currentStep];

      // Se path é 'guided' OU step atual está na sequência guiada (ex: aberto via menu de ajuda)
      const isInGuidedSequence = guidedSteps.includes(prev.currentStep);
      if (prev.path === 'guided' || isInGuidedSequence) {
        const currentIndex = guidedSteps.indexOf(prev.currentStep);
        const nextStepValue = guidedSteps[currentIndex + 1] || 'complete';

        return {
          ...prev,
          currentStep: nextStepValue,
          completedSteps: updatedCompleted,
          completedAt: nextStepValue === 'complete' ? new Date().toISOString() : prev.completedAt,
        };
      }

      // Path direto vai direto para complete
      return {
        ...prev,
        currentStep: 'complete',
        completedSteps: updatedCompleted,
        completedAt: new Date().toISOString(),
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setProgress(prev => {
      const guidedSteps: OnboardingStep[] = [
        'welcome',
        'requirements',
        'create-app',
        'add-whatsapp',
        'credentials',
        'test-connection',
        'configure-webhook',
        'sync-templates',
        'send-first-message',
        'create-permanent-token',
      ];

      if (prev.path === 'guided') {
        const currentIndex = guidedSteps.indexOf(prev.currentStep);
        const prevStep = guidedSteps[Math.max(0, currentIndex - 1)];
        return { ...prev, currentStep: prevStep };
      }

      // Se aberto via menu de ajuda (path null mas em guided sequence), fecha o modal
      const isInGuidedSequence = guidedSteps.includes(prev.currentStep);
      if (isInGuidedSequence) {
        return { ...prev, currentStep: 'complete' };
      }

      // Path direto volta para welcome
      return { ...prev, currentStep: 'welcome', path: null };
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      currentStep: 'complete',
      completedAt: new Date().toISOString(),
    }));
  }, []);

  // ============================================================================
  // Checklist UI Actions
  // ============================================================================

  const minimizeChecklist = useCallback((minimized: boolean) => {
    setProgress(prev => ({
      ...prev,
      isChecklistMinimized: minimized,
    }));
  }, []);

  const dismissChecklist = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isChecklistDismissed: true,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isOnboardingComplete = useMemo(() => {
    return progress.currentStep === 'complete' || progress.completedAt !== null;
  }, [progress.currentStep, progress.completedAt]);

  const shouldShowOnboardingModal = useMemo(() => {
    // Mostra modal se não completou onboarding
    return !isOnboardingComplete && isLoaded;
  }, [isOnboardingComplete, isLoaded]);

  const shouldShowChecklist = useMemo(() => {
    // Mostra checklist se:
    // 1. Onboarding wizard foi completado
    // 2. Usuário não dismissou o checklist
    // O componente OnboardingChecklist decide internamente se esconde quando 100% completo
    return isOnboardingComplete && !progress.isChecklistDismissed;
  }, [isOnboardingComplete, progress.isChecklistDismissed]);

  const currentStepNumber = useMemo(() => {
    const guidedSteps: OnboardingStep[] = [
      'requirements',
      'create-app',
      'add-whatsapp',
      'credentials',
      'test-connection',
      'configure-webhook',
      'sync-templates',
      'send-first-message',
      'create-permanent-token',
    ];
    const index = guidedSteps.indexOf(progress.currentStep);
    return index >= 0 ? index + 1 : 0;
  }, [progress.currentStep]);

  const totalSteps = 9;

  // Progresso do checklist (usado pelo ChecklistMiniBadge)
  const checklistProgress = useMemo(() => {
    const total = totalSteps;
    const completed = progress.completedSteps.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [progress.completedSteps.length, totalSteps]);

  return {
    // State
    progress,
    isLoaded,

    // Computed
    isOnboardingComplete,
    shouldShowOnboardingModal,
    shouldShowChecklist,
    currentStepNumber,
    totalSteps,
    checklistProgress,

    // Actions
    startOnboarding,
    goToStep,
    completeStep,
    nextStep,
    previousStep,
    completeOnboarding,

    // Checklist UI
    minimizeChecklist,
    dismissChecklist,

    // Reset
    resetOnboarding,
  };
}
