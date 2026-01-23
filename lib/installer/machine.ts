/**
 * State Machine para o fluxo de instalação.
 *
 * Implementa um reducer que garante transições de estado válidas,
 * impossibilitando loops ou estados inválidos.
 */

import type { InstallState, InstallAction, InstallStep } from './types';

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialState: InstallState = {
  phase: 'collecting',
  step: 1,
};

// =============================================================================
// REDUCER
// =============================================================================

export function installReducer(state: InstallState, action: InstallAction): InstallState {
  switch (action.type) {
    // -------------------------------------------------------------------------
    // NAVIGATION
    // -------------------------------------------------------------------------

    case 'NEXT': {
      if (state.phase !== 'collecting') return state;

      // Step 5 → Start provisioning
      if (state.step === 5) {
        return {
          phase: 'provisioning',
          progress: 0,
          title: 'Iniciando...',
          subtitle: 'Preparando ambiente',
        };
      }

      // Go to next step
      return {
        ...state,
        step: (state.step + 1) as InstallStep,
      };
    }

    case 'BACK': {
      if (state.phase !== 'collecting') return state;
      if (state.step === 1) return state; // Can't go back from step 1

      return {
        ...state,
        step: (state.step - 1) as InstallStep,
      };
    }

    case 'GO_TO_STEP': {
      if (state.phase !== 'collecting' && state.phase !== 'error') return state;

      return {
        phase: 'collecting',
        step: action.step,
      };
    }

    // -------------------------------------------------------------------------
    // PROVISIONING
    // -------------------------------------------------------------------------

    case 'START_PROVISIONING': {
      if (state.phase !== 'collecting' || state.step !== 5) return state;

      return {
        phase: 'provisioning',
        progress: 0,
        title: 'Iniciando...',
        subtitle: 'Preparando ambiente',
      };
    }

    case 'PROGRESS': {
      if (state.phase !== 'provisioning') return state;

      return {
        ...state,
        progress: action.progress,
        title: action.title,
        subtitle: action.subtitle,
      };
    }

    case 'ERROR': {
      return {
        phase: 'error',
        returnToStep: action.returnToStep,
        error: action.error,
        errorDetails: action.errorDetails,
      };
    }

    case 'COMPLETE': {
      if (state.phase !== 'provisioning') return state;

      return {
        phase: 'success',
      };
    }

    // -------------------------------------------------------------------------
    // ERROR RECOVERY
    // -------------------------------------------------------------------------

    case 'RETRY': {
      if (state.phase !== 'error') return state;

      return {
        phase: 'collecting',
        step: state.returnToStep,
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

export function isCollecting(state: InstallState): state is { phase: 'collecting'; step: InstallStep } {
  return state.phase === 'collecting';
}

export function isProvisioning(state: InstallState): state is {
  phase: 'provisioning';
  progress: number;
  title: string;
  subtitle: string;
} {
  return state.phase === 'provisioning';
}

export function isError(state: InstallState): state is {
  phase: 'error';
  returnToStep: InstallStep;
  error: string;
  errorDetails?: string;
} {
  return state.phase === 'error';
}

export function isSuccess(state: InstallState): state is { phase: 'success' } {
  return state.phase === 'success';
}
