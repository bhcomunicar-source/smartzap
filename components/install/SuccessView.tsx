'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepCard } from './StepCard';

interface SuccessViewProps {
  name: string;
}

/**
 * View de sucesso após instalação completa.
 */
export function SuccessView({ name }: SuccessViewProps) {
  const firstName = name.split(' ')[0] || 'você';

  const handleGoToDashboard = () => {
    window.location.href = '/login';
  };

  return (
    <StepCard glowColor="emerald">
      <div className="flex flex-col items-center text-center py-8">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center"
        >
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-xl font-semibold text-zinc-100"
        >
          Bem-vindo à realidade, {firstName}.
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-sm text-zinc-400"
        >
          Você é o Escolhido.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 w-full"
        >
          <Button variant="brand" size="lg" className="w-full" onClick={handleGoToDashboard}>
            Entrar na Matrix
          </Button>
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-xs text-zinc-500"
        >
          Não há colher. Configure o WhatsApp em Configurações.
        </motion.p>
      </div>
    </StepCard>
  );
}
