'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepCard } from './StepCard';
import { cn } from '@/lib/utils';
import type { InstallStep } from '@/lib/installer/types';

interface ErrorViewProps {
  error: string;
  errorDetails?: string;
  returnToStep: InstallStep;
  onRetry: () => void;
  onGoToStep: (step: InstallStep) => void;
}

const STEP_NAMES: Record<InstallStep, string> = {
  1: 'Identidade',
  2: 'Link Neural',
  3: 'Memória Base',
  4: 'Transmissão',
  5: 'Cache',
};

/**
 * View de erro durante o provisioning.
 * Tema Blade Runner - "Falha de Replicação"
 */
export function ErrorView({ error, errorDetails, returnToStep, onRetry, onGoToStep }: ErrorViewProps) {
  return (
    <StepCard glowColor="red">
      <div className="flex flex-col items-center text-center py-8">
        {/* Error icon with glow */}
        <motion.div
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            'w-20 h-20 rounded-full',
            'bg-[var(--br-neon-pink)]/20 border-2 border-[var(--br-neon-pink)]',
            'flex items-center justify-center',
            'shadow-[0_0_30px_var(--br-neon-pink)/0.4]'
          )}
        >
          <AlertCircle className="w-10 h-10 text-[var(--br-neon-pink)]" />
        </motion.div>

        {/* Title - Blade Runner style */}
        <h2 className="mt-6 text-xl font-mono font-bold text-[var(--br-hologram-white)] uppercase tracking-wide">
          Falha de Replicação
        </h2>

        {/* Error message */}
        <p className="mt-2 text-sm text-[var(--br-neon-pink)] font-mono max-w-sm">{error}</p>

        {/* Error details */}
        {errorDetails && (
          <motion.details
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 w-full text-left"
          >
            <summary className="text-xs font-mono text-[var(--br-dust-gray)] cursor-pointer hover:text-[var(--br-muted-cyan)]">
              {'>'} Log de diagnóstico
            </summary>
            <pre className="mt-2 p-3 bg-[var(--br-void-black)] border border-[var(--br-dust-gray)]/30 rounded-lg text-xs text-[var(--br-muted-cyan)] font-mono overflow-auto max-h-32">
              {errorDetails}
            </pre>
          </motion.details>
        )}

        {/* Problem hint */}
        <p className="mt-4 text-xs font-mono text-[var(--br-dust-gray)]">
          Anomalia detectada em: <strong className="text-[var(--br-neon-orange)]">{STEP_NAMES[returnToStep]}</strong>
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-8 w-full">
          <Button
            variant="outline"
            className={cn(
              'flex-1 font-mono uppercase text-xs',
              'border-[var(--br-dust-gray)] hover:border-[var(--br-neon-cyan)]',
              'text-[var(--br-muted-cyan)] hover:text-[var(--br-neon-cyan)]',
              'transition-all duration-200'
            )}
            onClick={() => onGoToStep(returnToStep)}
          >
            Corrigir {STEP_NAMES[returnToStep]}
          </Button>
          <Button
            className={cn(
              'flex-1 font-mono uppercase text-xs',
              'bg-[var(--br-neon-cyan)] hover:bg-[var(--br-neon-cyan)]/80',
              'text-[var(--br-void-black)] font-bold',
              'shadow-[0_0_15px_var(--br-neon-cyan)/0.4]',
              'transition-all duration-200'
            )}
            onClick={onRetry}
          >
            Reiniciar Incubação
          </Button>
        </div>
      </div>
    </StepCard>
  );
}
