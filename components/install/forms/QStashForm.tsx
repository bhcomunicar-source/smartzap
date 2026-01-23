'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FormProps } from './types';

/**
 * Form de token QStash simplificado.
 * Apenas coleta o token, sem validação de API.
 */
export function QStashForm({ data, onComplete, onBack, showBack }: FormProps) {
  const [token, setToken] = useState(data.qstashToken);

  // QStash token: JWT (eyJ...) ou qstash_
  const isValidFormat =
    token.trim().startsWith('eyJ') || token.trim().startsWith('qstash_') || token.trim().split('.').length === 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidFormat && token.trim().length >= 30) {
      onComplete({ qstashToken: token.trim() });
    }
  };

  const canSubmit = isValidFormat && token.trim().length >= 30;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">Configure filas de mensagens</h2>
        <p className="mt-1 text-sm text-zinc-400">Token do Upstash QStash</p>
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">QStash Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJVc2VySUQi... ou qstash_..."
          autoFocus
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-zinc-800/50 border border-zinc-700',
            'text-zinc-100 placeholder:text-zinc-500 font-mono text-sm',
            'focus:border-orange-500 focus:outline-none',
            'focus:shadow-[0_0_0_3px_theme(colors.orange.500/0.15)]',
            'transition-all duration-200'
          )}
        />
        {token.length > 0 && (
          <p className={cn('mt-2 text-xs', canSubmit ? 'text-orange-400' : 'text-zinc-500')}>
            {canSubmit ? '✓ Formato válido' : 'Token deve começar com eyJ ou qstash_'}
          </p>
        )}
      </div>

      {/* Collapsible help */}
      <details className="w-full group">
        <summary className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer list-none transition-colors">
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          Como obter o token?
        </summary>
        <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 text-left space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
            <li>
              Crie uma conta gratuita no{' '}
              <a href="https://console.upstash.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                Upstash
              </a>
            </li>
            <li>
              Clique em <strong className="text-zinc-300">QStash</strong> no menu lateral
            </li>
            <li>
              Copie o <strong className="text-zinc-300">QSTASH_TOKEN</strong> na aba Details
            </li>
          </ol>
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-3">
        {showBack && (
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Voltar
          </Button>
        )}
        <Button type="submit" variant="brand" size="lg" className="flex-1" disabled={!canSubmit}>
          Continuar
        </Button>
      </div>
    </form>
  );
}
