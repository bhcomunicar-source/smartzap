'use client';

import { useState, useRef, useEffect } from 'react';
import { Link2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';
import { useHaptic } from '@/hooks/telegram';
import { MockMainButton } from '@/hooks/telegram/useMainButton';

// =============================================================================
// COMPONENTES
// =============================================================================

function CodeInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { selection } = useHaptic();

  // Formato: ABC-123-XYZ (3-3-3 = 9 chars, mas 11 com hífens)
  const segments = [
    value.slice(0, 3),
    value.slice(3, 6),
    value.slice(6, 9),
  ];

  const handleInput = (segmentIndex: number, charIndex: number, char: string) => {
    const cleanChar = char.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanChar) return;

    selection();

    const globalIndex = segmentIndex * 3 + charIndex;
    const newValue = value.slice(0, globalIndex) + cleanChar + value.slice(globalIndex + 1);
    onChange(newValue.slice(0, 9));

    // Auto-focus próximo input
    const nextGlobalIndex = globalIndex + 1;
    if (nextGlobalIndex < 9) {
      const nextSegment = Math.floor(nextGlobalIndex / 3);
      const nextChar = nextGlobalIndex % 3;
      inputRefs.current[nextSegment * 3 + nextChar]?.focus();
    } else if (newValue.length === 9) {
      onComplete();
    }
  };

  const handleKeyDown = (
    segmentIndex: number,
    charIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const globalIndex = segmentIndex * 3 + charIndex;

    if (e.key === 'Backspace') {
      e.preventDefault();
      selection();

      if (value[globalIndex]) {
        // Apagar char atual
        const newValue = value.slice(0, globalIndex) + value.slice(globalIndex + 1);
        onChange(newValue);
      } else if (globalIndex > 0) {
        // Ir para input anterior
        const prevGlobalIndex = globalIndex - 1;
        const prevSegment = Math.floor(prevGlobalIndex / 3);
        const prevChar = prevGlobalIndex % 3;
        inputRefs.current[prevSegment * 3 + prevChar]?.focus();

        const newValue = value.slice(0, prevGlobalIndex) + value.slice(prevGlobalIndex + 1);
        onChange(newValue);
      }
    }

    if (e.key === 'ArrowLeft' && globalIndex > 0) {
      e.preventDefault();
      const prevGlobalIndex = globalIndex - 1;
      const prevSegment = Math.floor(prevGlobalIndex / 3);
      const prevChar = prevGlobalIndex % 3;
      inputRefs.current[prevSegment * 3 + prevChar]?.focus();
    }

    if (e.key === 'ArrowRight' && globalIndex < 8) {
      e.preventDefault();
      const nextGlobalIndex = globalIndex + 1;
      const nextSegment = Math.floor(nextGlobalIndex / 3);
      const nextChar = nextGlobalIndex % 3;
      inputRefs.current[nextSegment * 3 + nextChar]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
    onChange(pasted.slice(0, 9));
    if (pasted.length >= 9) {
      onComplete();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {segments.map((segment, segmentIndex) => (
        <div key={segmentIndex} className="flex items-center gap-1">
          {[0, 1, 2].map((charIndex) => {
            const globalIndex = segmentIndex * 3 + charIndex;
            return (
              <input
                key={charIndex}
                ref={(el) => { inputRefs.current[globalIndex] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={segment[charIndex] || ''}
                onChange={(e) => handleInput(segmentIndex, charIndex, e.target.value)}
                onKeyDown={(e) => handleKeyDown(segmentIndex, charIndex, e)}
                onPaste={handlePaste}
                className="w-10 h-12 text-center text-xl font-mono font-bold rounded-lg bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border-2 border-transparent focus:border-[var(--tg-theme-button-color)] focus:outline-none transition-colors uppercase"
              />
            );
          })}
          {segmentIndex < 2 && (
            <span className="text-[var(--tg-theme-hint-color)] text-xl font-bold">-</span>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// PÁGINA DE VINCULAÇÃO
// =============================================================================

export default function LinkPage() {
  const { user, setIsLinked, showAlert, hapticFeedback } = useTelegramSDK();
  const { notification } = useHaptic();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isCodeComplete = code.length === 9;

  const handleSubmit = async () => {
    if (!isCodeComplete || isLoading) return;

    setIsLoading(true);
    hapticFeedback('medium');

    // Simular chamada de API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock: código "ABC123XYZ" funciona, outros falham
    const formattedCode = `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6, 9)}`;

    if (code.toUpperCase() === 'ABC123XYZ') {
      setIsSuccess(true);
      notification('success');

      // Aguardar animação e redirecionar
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsLinked(true);
    } else {
      setIsLoading(false);
      notification('error');
      showAlert(`Código inválido: ${formattedCode}\n\nPara testar, use: ABC-123-XYZ`);
    }
  };

  // Estado de sucesso
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Vinculado!</h1>
        <p className="text-[var(--tg-theme-hint-color)]">
          Sua conta foi vinculada com sucesso
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[var(--tg-theme-button-color)]/20 flex items-center justify-center mb-6">
          <Link2 size={36} className="text-[var(--tg-theme-button-color)]" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-2 text-center">
          Vincular SmartZap
        </h1>
        <p className="text-[var(--tg-theme-hint-color)] text-center mb-8 max-w-xs">
          Digite o código gerado no dashboard para conectar sua conta
        </p>

        {/* Code input */}
        <div className="mb-6">
          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={handleSubmit}
          />
        </div>

        {/* Help text */}
        <div className="text-center">
          <p className="text-sm text-[var(--tg-theme-hint-color)] mb-2">
            Não tem código?
          </p>
          <a
            href="https://smartzap.com.br/settings/telegram"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--tg-theme-link-color)] hover:underline"
          >
            Acesse o dashboard
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Test hint (apenas em dev) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400 text-center">
              🧪 <strong>Modo dev:</strong> Use <code className="bg-amber-500/20 px-1 rounded">ABC-123-XYZ</code> para testar
            </p>
          </div>
        )}
      </div>

      {/* Main Button */}
      <MockMainButton
        text={isLoading ? 'Vinculando...' : 'Vincular'}
        onClick={handleSubmit}
        isVisible={true}
        isEnabled={isCodeComplete}
        isLoading={isLoading}
        color="var(--tg-theme-button-color)"
        textColor="var(--tg-theme-button-text-color)"
      />

      {/* Spacer for button */}
      <div className="h-24" />
    </div>
  );
}
