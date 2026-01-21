'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';

interface UseBackButtonConfig {
  isVisible?: boolean;
  onBack?: () => void;
}

/**
 * Hook para controlar o BackButton nativo do Telegram
 * Por padrão, navega para a página anterior
 */
export function useBackButton(config: UseBackButtonConfig = {}) {
  const { isMock } = useTelegramSDK();
  const router = useRouter();

  const { isVisible = true, onBack } = config;

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  // Telegram real
  useEffect(() => {
    if (isMock || typeof window === 'undefined' || !window.Telegram?.WebApp?.BackButton) {
      return;
    }

    const backButton = window.Telegram.WebApp.BackButton;

    if (isVisible) {
      backButton.show();
      backButton.onClick(handleBack);
    } else {
      backButton.hide();
    }

    return () => {
      backButton.offClick(handleBack);
      backButton.hide();
    };
  }, [isMock, isVisible, handleBack]);

  return {
    isMock,
    isVisible,
    onBack: handleBack,
  };
}

/**
 * Componente visual do BackButton para modo mock
 * Renderiza uma seta no header
 */
export function MockBackButton({
  isVisible,
  onBack,
}: {
  isVisible: boolean;
  onBack: () => void;
}) {
  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={onBack}
      className="p-2 -ml-2 rounded-lg text-[var(--tg-theme-text-color)] hover:bg-[var(--tg-theme-secondary-bg-color)] transition-colors"
      aria-label="Voltar"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
