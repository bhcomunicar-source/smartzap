'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SuccessCheckmarkProps {
  onComplete?: () => void;
  delay?: number;
  message?: string;
  className?: string;
}

/**
 * Animação de checkmark que aparece após validação bem-sucedida.
 *
 * Características:
 * - Círculo com scale animation
 * - Glow ring pulsante
 * - Checkmark com draw animation
 * - Auto-callback após delay
 */
export function SuccessCheckmark({
  onComplete,
  delay = 1200,
  message = 'Validado com sucesso!',
  className,
}: SuccessCheckmarkProps) {
  useEffect(() => {
    if (onComplete) {
      console.log(`[SuccessCheckmark] Agendando callback em ${delay}ms...`);
      const timer = setTimeout(() => {
        console.log('[SuccessCheckmark] Executando onComplete callback');
        onComplete();
      }, delay);
      return () => {
        console.log('[SuccessCheckmark] Limpando timer (componente desmontado?)');
        clearTimeout(timer);
      };
    }
  }, [onComplete, delay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center py-8',
        className
      )}
    >
      {/* Circle with checkmark */}
      <div className="relative">
        {/* Glow ring expanding */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500/30"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.8, 1.8],
            opacity: [0.5, 0, 0],
          }}
          transition={{
            duration: 1,
            times: [0, 0.5, 1],
            repeat: 1,
            repeatDelay: 0.3,
          }}
        />

        {/* Circle background */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          className={cn(
            'w-20 h-20 rounded-full',
            'bg-emerald-500/20',
            'border-2 border-emerald-500',
            'flex items-center justify-center'
          )}
        >
          {/* Checkmark icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Check
              className="w-10 h-10 text-emerald-500"
              strokeWidth={3}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Success message */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-lg font-medium text-zinc-100"
      >
        {message}
      </motion.p>

      {/* Subtle progress bar for visual feedback */}
      <motion.div
        className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden w-32"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: delay / 1000, ease: 'linear' }}
        />
      </motion.div>
    </motion.div>
  );
}
