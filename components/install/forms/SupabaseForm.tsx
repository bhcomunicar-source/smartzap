'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FormProps } from './types';

/**
 * Form de PAT Supabase SIMPLIFICADO.
 *
 * ANTES: 445 linhas com provisioning completo inline
 * AGORA: ~100 linhas, apenas coleta o PAT
 *
 * A criação de projeto, waiting, e resolução de keys
 * acontecem no provisioning unificado.
 */
export function SupabaseForm({ data, onComplete, onBack, showBack }: FormProps) {
  const [pat, setPat] = useState(data.supabasePat);

  // PAT começa com sbp_ e tem ~40+ chars
  const isValidFormat = pat.trim().startsWith('sbp_') && pat.trim().length >= 40;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidFormat) {
      onComplete({ supabasePat: pat.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.362 9.354H12V.396a.396.396 0 00-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 00.836 1.659H12v8.959a.396.396 0 00.716.233l9.081-12.261.401-.562a1.04 1.04 0 00-.836-1.66z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">Conecte o Supabase</h2>
        <p className="mt-1 text-sm text-zinc-400">Personal Access Token (PAT)</p>
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Supabase PAT</label>
        <input
          type="password"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="sbp_..."
          autoFocus
          className={cn(
            'w-full px-4 py-3 rounded-xl',
            'bg-zinc-800/50 border border-zinc-700',
            'text-zinc-100 placeholder:text-zinc-500 font-mono text-sm',
            'focus:border-emerald-500 focus:outline-none',
            'focus:shadow-[0_0_0_3px_theme(colors.emerald.500/0.15)]',
            'transition-all duration-200'
          )}
        />
        {pat.length > 0 && (
          <p className={cn('mt-2 text-xs', isValidFormat ? 'text-emerald-400' : 'text-zinc-500')}>
            {isValidFormat ? '✓ Formato válido' : 'Token deve começar com sbp_ e ter 40+ caracteres'}
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
              <a
                href="https://supabase.com/dashboard/account/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                supabase.com/dashboard/account/tokens
              </a>
            </li>
            <li>
              Clique em <strong className="text-zinc-300">Generate new token</strong>
            </li>
            <li>
              Nome: <strong className="text-zinc-300">smartzap</strong>
            </li>
            <li>Copie o token (começa com sbp_)</li>
          </ol>
          <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700">
            O projeto Supabase será criado automaticamente durante a instalação.
          </p>
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
