'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepCard } from './StepCard';
import type { InstallStep, STEP_META } from '@/lib/installer/types';

interface ErrorViewProps {
  error: string;
  errorDetails?: string;
  returnToStep: InstallStep;
  onRetry: () => void;
  onGoToStep: (step: InstallStep) => void;
}

const STEP_NAMES: Record<InstallStep, string> = {
  1: 'Identidade',
  2: 'Vercel',
  3: 'Supabase',
  4: 'QStash',
  5: 'Redis',
};

/**
 * View de erro durante o provisioning.
 * Permite voltar para o step que causou o erro ou tentar novamente.
 */
export function ErrorView({ error, errorDetails, returnToStep, onRetry, onGoToStep }: ErrorViewProps) {
  return (
    <StepCard glowColor="red">
      <div className="flex flex-col items-center text-center py-8">
        {/* Error icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>

        {/* Title */}
        <h2 className="mt-6 text-xl font-semibold text-zinc-100">Glitch na Matrix</h2>

        {/* Error message */}
        <p className="mt-2 text-sm text-red-400 max-w-sm">{error}</p>

        {/* Error details */}
        {errorDetails && (
          <motion.details
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 w-full text-left"
          >
            <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
              Detalhes técnicos
            </summary>
            <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs text-zinc-400 overflow-auto max-h-32">
              {errorDetails}
            </pre>
          </motion.details>
        )}

        {/* Problem hint */}
        <p className="mt-4 text-xs text-zinc-500">
          Problema detectado no passo: <strong className="text-zinc-400">{STEP_NAMES[returnToStep]}</strong>
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-8 w-full">
          <Button variant="outline" className="flex-1" onClick={() => onGoToStep(returnToStep)}>
            Corrigir {STEP_NAMES[returnToStep]}
          </Button>
          <Button variant="brand" className="flex-1" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    </StepCard>
  );
}
