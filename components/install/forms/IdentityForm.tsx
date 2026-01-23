'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { FormProps } from './types';

// Charset sem caracteres ambíguos (I, l, 1, O, 0)
const PASSWORD_CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';

function generateStrongPassword(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => PASSWORD_CHARSET[b % PASSWORD_CHARSET.length]).join('');
}

function validatePassword(password: string): {
  valid: boolean;
  checks: { minLen: boolean; hasLetter: boolean; hasNumber: boolean };
} {
  const checks = {
    minLen: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
  return {
    valid: Object.values(checks).every(Boolean),
    checks,
  };
}

/**
 * Form de identidade simplificado.
 * Coleta nome, email e senha. Sem validação de API.
 */
export function IdentityForm({ data, onComplete }: FormProps) {
  const [name, setName] = useState(data.name);
  const [email, setEmail] = useState(data.email);
  const [password, setPassword] = useState(data.password);
  const [confirmPassword, setConfirmPassword] = useState(data.password);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = validatePassword(password);

  const handleSuggestPassword = useCallback(() => {
    const suggested = generateStrongPassword(16);
    setPassword(suggested);
    setConfirmPassword(suggested);
    setShowPassword(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError('Nome deve ter no mínimo 2 caracteres');
      return;
    }

    if (!email.includes('@')) {
      setError('Email inválido');
      return;
    }

    if (!validation.valid) {
      setError('Senha deve ter no mínimo 8 caracteres, 1 letra e 1 número');
      return;
    }

    if (password !== confirmPassword) {
      setError('Senhas não conferem');
      return;
    }

    onComplete({ name: name.trim(), email, password });
  };

  const inputClass = cn(
    'w-full pl-10 pr-4 py-3 rounded-xl',
    'bg-zinc-800/50 border border-zinc-700',
    'text-zinc-100 placeholder:text-zinc-500',
    'focus:border-emerald-500 focus:outline-none',
    'focus:shadow-[0_0_0_3px_theme(colors.emerald.500/0.15)]',
    'transition-all duration-200'
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <User className="w-7 h-7 text-zinc-400" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">Crie sua conta</h2>
        <p className="mt-1 text-sm text-zinc-400">Dados para acessar o painel</p>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Seu nome</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como devemos te chamar?"
            autoFocus
            className={inputClass}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-zinc-300">Senha</label>
          <button
            type="button"
            onClick={handleSuggestPassword}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Sugerir senha forte
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={cn(inputClass, 'pr-10', showPassword && 'font-mono text-sm')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 flex gap-3 text-xs"
          >
            <span className={validation.checks.minLen ? 'text-emerald-400' : 'text-zinc-500'}>
              {validation.checks.minLen ? '✓' : '○'} 8+ chars
            </span>
            <span className={validation.checks.hasLetter ? 'text-emerald-400' : 'text-zinc-500'}>
              {validation.checks.hasLetter ? '✓' : '○'} Letra
            </span>
            <span className={validation.checks.hasNumber ? 'text-emerald-400' : 'text-zinc-500'}>
              {validation.checks.hasNumber ? '✓' : '○'} Número
            </span>
          </motion.div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Confirmar senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            className={cn(inputClass, 'pr-10', showConfirm && 'font-mono text-sm')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {confirmPassword.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn('mt-2 text-xs', password === confirmPassword ? 'text-emerald-400' : 'text-red-400')}
          >
            {password === confirmPassword ? '✓ Senhas conferem' : '✗ Senhas não conferem'}
          </motion.p>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 text-center">
          {error}
        </motion.p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full"
        disabled={!name.trim() || !email || !validation.valid || password !== confirmPassword}
      >
        Continuar
      </Button>
    </form>
  );
}
