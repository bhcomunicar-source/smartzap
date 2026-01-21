'use client';

import { useEffect, useCallback, useState } from 'react';
import { useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';

interface UseMainButtonConfig {
  text: string;
  onClick: () => void;
  isVisible?: boolean;
  isEnabled?: boolean;
  isLoading?: boolean;
  color?: string;
  textColor?: string;
}

/**
 * Hook para controlar o MainButton nativo do Telegram
 * Em modo mock, renderiza um botão flutuante no bottom da tela
 */
export function useMainButton(config: UseMainButtonConfig) {
  const { isMock, themeParams } = useTelegramSDK();
  const [mockState, setMockState] = useState({
    isVisible: config.isVisible ?? true,
    isLoading: config.isLoading ?? false,
  });

  const {
    text,
    onClick,
    isVisible = true,
    isEnabled = true,
    isLoading = false,
    color,
    textColor,
  } = config;

  // Atualizar estado mock quando config mudar
  useEffect(() => {
    setMockState({
      isVisible,
      isLoading,
    });
  }, [isVisible, isLoading]);

  // Telegram real
  useEffect(() => {
    if (isMock || typeof window === 'undefined' || !window.Telegram?.WebApp?.MainButton) {
      return;
    }

    const mainButton = window.Telegram.WebApp.MainButton;

    // Configurar
    mainButton.setText(text);
    mainButton.color = color || themeParams.buttonColor;
    mainButton.textColor = textColor || themeParams.buttonTextColor;

    // Visibilidade
    if (isVisible) {
      mainButton.show();
    } else {
      mainButton.hide();
    }

    // Enabled/Disabled
    if (isEnabled && !isLoading) {
      mainButton.enable();
    } else {
      mainButton.disable();
    }

    // Loading
    if (isLoading) {
      mainButton.showProgress(false);
    } else {
      mainButton.hideProgress();
    }

    // Click handler
    mainButton.onClick(onClick);

    return () => {
      mainButton.offClick(onClick);
      mainButton.hide();
    };
  }, [isMock, text, onClick, isVisible, isEnabled, isLoading, color, textColor, themeParams]);

  // Retornar estado e controles para modo mock
  return {
    isMock,
    mockState,
    text,
    onClick,
    isEnabled,
    isLoading,
    color: color || themeParams.buttonColor,
    textColor: textColor || themeParams.buttonTextColor,
  };
}

/**
 * Componente visual do MainButton para modo mock
 * Deve ser renderizado no layout do Mini App
 */
export function MockMainButton({
  text,
  onClick,
  isVisible,
  isEnabled,
  isLoading,
  color,
  textColor,
}: {
  text: string;
  onClick: () => void;
  isVisible: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  color: string;
  textColor: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--tg-theme-bg-color)] to-transparent pt-8">
      <button
        type="button"
        onClick={onClick}
        disabled={!isEnabled || isLoading}
        className="w-full h-12 rounded-xl font-medium text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        style={{
          backgroundColor: color,
          color: textColor,
        }}
      >
        {isLoading && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {text}
      </button>
    </div>
  );
}
