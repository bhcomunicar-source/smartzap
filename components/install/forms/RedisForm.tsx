'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FormProps } from './types';

/**
 * Form de credenciais Redis simplificado.
 * Coleta REST URL e REST Token do Upstash Redis.
 */
export function RedisForm({ data, onComplete, onBack, showBack }: FormProps) {
  const [restUrl, setRestUrl] = useState(data.redisRestUrl);
  const [restToken, setRestToken] = useState(data.redisRestToken);

  const isValidUrl = restUrl.trim().startsWith('https://') && restUrl.trim().includes('.upstash.io');
  const isValidToken = restToken.trim().length >= 30 && /^[A-Za-z0-9_=-]+$/.test(restToken.trim());
  const canSubmit = isValidUrl && isValidToken;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onComplete({
        redisRestUrl: restUrl.trim(),
        redisRestToken: restToken.trim(),
      });
    }
  };

  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl',
    'bg-zinc-800/50 border border-zinc-700',
    'text-zinc-100 placeholder:text-zinc-500 font-mono text-sm',
    'focus:border-red-500 focus:outline-none',
    'focus:shadow-[0_0_0_3px_theme(colors.red.500/0.15)]',
    'transition-all duration-200'
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">Configure cache de webhooks</h2>
        <p className="mt-1 text-sm text-zinc-400">Credenciais REST do Upstash Redis</p>
      </div>

      {/* REST URL */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">REST URL</label>
        <input
          type="url"
          value={restUrl}
          onChange={(e) => setRestUrl(e.target.value)}
          placeholder="https://xxx-xxx.upstash.io"
          autoFocus
          className={inputClass}
        />
        {restUrl.length > 0 && (
          <p className={cn('mt-2 text-xs', isValidUrl ? 'text-red-400' : 'text-zinc-500')}>
            {isValidUrl ? '✓ URL válida' : 'Formato: https://xxx.upstash.io'}
          </p>
        )}
      </div>

      {/* REST Token */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">REST Token</label>
        <input
          type="password"
          value={restToken}
          onChange={(e) => setRestToken(e.target.value)}
          placeholder="AXxxxxxxxxxxxxxxxxxxxx"
          className={inputClass}
        />
        {restToken.length > 0 && (
          <p className={cn('mt-2 text-xs', isValidToken ? 'text-red-400' : 'text-zinc-500')}>
            {isValidToken ? '✓ Token válido' : 'Token deve ter 30+ caracteres alfanuméricos'}
          </p>
        )}
      </div>

      {/* Collapsible help */}
      <details className="w-full group">
        <summary className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 cursor-pointer list-none transition-colors">
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          Como criar um banco Redis?
        </summary>
        <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 text-left space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
            <li>
              Acesse o{' '}
              <a href="https://console.upstash.com/redis" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">
                console Upstash Redis
              </a>
            </li>
            <li>
              Clique em <strong className="text-zinc-300">Create Database</strong>
            </li>
            <li>
              Nome: <strong className="text-zinc-300">smartzap</strong> • Região: <strong className="text-zinc-300">São Paulo</strong>
            </li>
            <li>
              Após criar, vá na aba <strong className="text-zinc-300">REST API</strong>
            </li>
            <li>Copie a URL e o Token</li>
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
          Iniciar Instalação
        </Button>
      </div>
    </form>
  );
}
