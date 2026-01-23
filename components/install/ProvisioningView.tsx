'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { StepCard } from './StepCard';
import type { InstallData, ProvisionStreamEvent, ProvisionPayload } from '@/lib/installer/types';

interface ProvisioningViewProps {
  data: InstallData;
  progress: number;
  title: string;
  subtitle: string;
  onProgress: (event: ProvisionStreamEvent) => void;
}

/**
 * View de provisionamento com streaming SSE.
 *
 * Responsável por:
 * 1. Chamar a API de provisioning
 * 2. Parsear eventos SSE
 * 3. Reportar progresso para o parent
 */
export function ProvisioningView({ data, progress, title, subtitle, onProgress }: ProvisioningViewProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);

  const startProvisioning = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

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
      const response = await fetch('/api/installer/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream não disponível');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: ProvisionStreamEvent = JSON.parse(line.slice(6));
              onProgress(event);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;

      onProgress({
        type: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        returnToStep: 1,
      });
    }
  }, [data, onProgress]);

  useEffect(() => {
    startProvisioning();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [startProvisioning]);

  return (
    <StepCard glowColor="emerald">
      <div className="flex flex-col items-center text-center py-8">
        {/* Animated icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500"
          />
          <div className="w-16 h-16 flex items-center justify-center">
            <Terminal className="w-8 h-8 text-emerald-500" />
          </div>
        </motion.div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 text-xl font-semibold text-zinc-100"
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
            className="mt-2 text-sm text-zinc-400 h-5"
          >
            {subtitle}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-full mt-8">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
        </div>

        <p className="mt-6 text-xs text-zinc-500">Não feche esta página</p>
      </div>
    </StepCard>
  );
}
