/**
 * Tipos centralizados para o fluxo de instalação.
 *
 * Este arquivo é a ÚNICA fonte de verdade para tipos do installer.
 * Não duplicar em outros arquivos.
 */

// =============================================================================
// DADOS COLETADOS
// =============================================================================

export interface InstallData {
  // Step 1: Identity
  name: string;
  email: string;
  password: string;

  // Step 2: Vercel
  vercelToken: string;

  // Step 3: Supabase
  supabasePat: string;

  // Step 4: QStash
  qstashToken: string;

  // Step 5: Redis
  redisRestUrl: string;
  redisRestToken: string;
}

export const EMPTY_INSTALL_DATA: InstallData = {
  name: '',
  email: '',
  password: '',
  vercelToken: '',
  supabasePat: '',
  qstashToken: '',
  redisRestUrl: '',
  redisRestToken: '',
};

// =============================================================================
// STATE MACHINE
// =============================================================================

export type InstallStep = 1 | 2 | 3 | 4 | 5;

export type InstallPhase = 'collecting' | 'provisioning' | 'error' | 'success';

export interface CollectingState {
  phase: 'collecting';
  step: InstallStep;
}

export interface ProvisioningState {
  phase: 'provisioning';
  progress: number;
  title: string;
  subtitle: string;
}

export interface ErrorState {
  phase: 'error';
  returnToStep: InstallStep;
  error: string;
  errorDetails?: string;
}

export interface SuccessState {
  phase: 'success';
}

export type InstallState =
  | CollectingState
  | ProvisioningState
  | ErrorState
  | SuccessState;

// =============================================================================
// ACTIONS
// =============================================================================

export type InstallAction =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'GO_TO_STEP'; step: InstallStep }
  | { type: 'START_PROVISIONING' }
  | { type: 'PROGRESS'; progress: number; title: string; subtitle: string }
  | { type: 'ERROR'; returnToStep: InstallStep; error: string; errorDetails?: string }
  | { type: 'COMPLETE' }
  | { type: 'RETRY' };

// =============================================================================
// PROVISIONING STREAM EVENTS
// =============================================================================

export interface ProvisionStreamEvent {
  type: 'progress' | 'error' | 'complete';
  progress?: number;
  title?: string;
  subtitle?: string;
  error?: string;
  errorDetails?: string;
  returnToStep?: InstallStep;
}

// =============================================================================
// API PAYLOADS
// =============================================================================

export interface ProvisionPayload {
  identity: {
    name: string;
    email: string;
    password: string;
  };
  vercel: {
    token: string;
  };
  supabase: {
    pat: string;
  };
  qstash: {
    token: string;
  };
  redis: {
    restUrl: string;
    restToken: string;
  };
}

// =============================================================================
// STEP METADATA
// =============================================================================

export const STEP_META: Record<InstallStep, { title: string; service: string }> = {
  1: { title: 'Identidade', service: 'identity' },
  2: { title: 'Vercel', service: 'vercel' },
  3: { title: 'Supabase', service: 'supabase' },
  4: { title: 'QStash', service: 'qstash' },
  5: { title: 'Redis', service: 'redis' },
};
