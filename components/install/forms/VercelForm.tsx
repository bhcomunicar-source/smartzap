'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FormProps } from './types';

/**
 * Form de token Vercel simplificado.
 * Apenas coleta o token, sem validação de API.
 * A validação acontece no provisioning.
 */
export function VercelForm({ data, onComplete, onBack, showBack }: FormProps) {
  const [token, setToken] = useState(data.vercelToken);

  const isValidFormat = token.trim().length >= 24;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidFormat) {
      onComplete({ vercelToken: token.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 19.5h20L12 2z" className="text-zinc-100" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">Conecte sua conta Vercel</h2>
        <p className="mt-1 text-sm text-zinc-400">Cole seu token de acesso</p>
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Vercel Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Cole seu token aqui..."
          autoFocus
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-zinc-800/50 border border-zinc-700',
            'text-zinc-100 placeholder:text-zinc-500 font-mono text-sm',
            'focus:border-blue-500 focus:outline-none',
            'focus:shadow-[0_0_0_3px_theme(colors.blue.500/0.15)]',
            'transition-all duration-200'
          )}
        />
        {token.length > 0 && (
          <p className={cn('mt-2 text-xs', isValidFormat ? 'text-blue-400' : 'text-zinc-500')}>
            {isValidFormat ? '✓ Formato válido' : `${token.length}/24 caracteres mínimos`}
          </p>
        )}
      </div>

      {/* Collapsible help */}
      <details className="w-full group">
        <summary className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer list-none transition-colors">
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          Como criar o token?
        </summary>
        <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 text-left space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
            <li>
              Acesse{' '}
              <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                vercel.com/account/tokens
              </a>
            </li>
            <li>
              Clique em <strong className="text-zinc-300">Create</strong>
            </li>
            <li>
              Nome: <strong className="text-zinc-300">smartzap</strong> • Scope: <strong className="text-zinc-300">Full Account</strong>
            </li>
            <li>Copie e cole o token acima</li>
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
        <Button type="submit" variant="brand" size="lg" className="flex-1" disabled={!isValidFormat}>
          Continuar
        </Button>
      </div>
    </form>
  );
}
