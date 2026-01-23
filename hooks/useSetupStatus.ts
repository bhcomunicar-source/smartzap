'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HealthStatus } from '@/lib/health-check';

interface SetupStatus {
  isWhatsAppConnected: boolean;
  isWebhookConfigured: boolean;
  hasSentFirstMessage: boolean;
  isPermanentTokenConfirmed: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = 'smartzap_setup_first_message_sent';

export function useSetupStatus(healthStatus: HealthStatus | null) {
  const [status, setStatus] = useState<SetupStatus>({
    isWhatsAppConnected: false,
    isWebhookConfigured: false,
    hasSentFirstMessage: false,
    isPermanentTokenConfirmed: false,
    isLoading: true,
  });

  // Busca status adicional do banco (token permanente, primeira mensagem)
  useEffect(() => {
    async function fetchAdditionalStatus() {
      try {
        // Verificar se já enviou primeira mensagem (localStorage + API)
        const localFirstMessage = localStorage.getItem(STORAGE_KEY) === 'true';

        // Buscar status do token permanente do banco
        let permanentTokenConfirmed = false;
        try {
          const res = await fetch('/api/settings/onboarding');
          if (res.ok) {
            const data = await res.json();
            permanentTokenConfirmed = data.permanentTokenConfirmed ?? false;
          }
        } catch {
          // Ignora erro
        }

        // Verificar se tem campanhas com mensagens enviadas (indica que já usou o sistema)
        // Usa dashboard stats que já tem totalMessagesSent agregado
        let hasMessages = localFirstMessage;
        if (!hasMessages) {
          try {
            const res = await fetch('/api/dashboard/stats');
            if (res.ok) {
              const data = await res.json();
              // Dashboard retorna totalSent como soma de todas as campanhas
              hasMessages = (data.totalSent || 0) > 0;
              if (hasMessages) {
                localStorage.setItem(STORAGE_KEY, 'true');
              }
            }
          } catch {
            // Fallback: verificar campanhas diretamente (busca mais para ter certeza)
            try {
              const res = await fetch('/api/campaigns?limit=50');
              if (res.ok) {
                const data = await res.json();
                const campaigns = data.campaigns || data || [];
                hasMessages = campaigns.some((c: { sent?: number }) => (c.sent || 0) > 0);
                if (hasMessages) {
                  localStorage.setItem(STORAGE_KEY, 'true');
                }
              }
            } catch {
              // Ignora erro
            }
          }
        }

        setStatus((prev) => ({
          ...prev,
          hasSentFirstMessage: hasMessages,
          isPermanentTokenConfirmed: permanentTokenConfirmed,
          isLoading: false,
        }));
      } catch {
        setStatus((prev) => ({ ...prev, isLoading: false }));
      }
    }

    fetchAdditionalStatus();
  }, []);

  // Atualiza baseado no healthStatus quando ele muda
  useEffect(() => {
    if (!healthStatus) return;

    setStatus((prev) => ({
      ...prev,
      isWhatsAppConnected: healthStatus.services.whatsapp.status === 'ok',
      isWebhookConfigured: healthStatus.services.webhook?.status === 'ok',
    }));
  }, [healthStatus]);

  // Marcar primeira mensagem como enviada
  const markFirstMessageSent = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setStatus((prev) => ({ ...prev, hasSentFirstMessage: true }));
  }, []);

  // Marcar token permanente como confirmado
  const markPermanentTokenConfirmed = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permanentTokenConfirmed: true }),
      });
      if (res.ok) {
        setStatus((prev) => ({ ...prev, isPermanentTokenConfirmed: true }));
        return true;
      }
    } catch {
      // Ignora erro
    }
    return false;
  }, []);

  // Refresh status (para após ações como conectar WhatsApp)
  const refreshStatus = useCallback(() => {
    setStatus((prev) => ({ ...prev, isLoading: true }));
    // O useEffect vai re-buscar quando healthStatus atualizar
  }, []);

  // Calcular progresso
  const requiredItems = [
    status.isWhatsAppConnected,
    status.hasSentFirstMessage,
    status.isWebhookConfigured,
  ];
  const completedCount = requiredItems.filter(Boolean).length;
  const progress = Math.round((completedCount / requiredItems.length) * 100);

  // Todos os items (incluindo opcionais) completos?
  const isAllComplete =
    status.isWhatsAppConnected &&
    status.hasSentFirstMessage &&
    status.isWebhookConfigured &&
    status.isPermanentTokenConfirmed;

  // Items essenciais completos?
  const isEssentialComplete =
    status.isWhatsAppConnected &&
    status.hasSentFirstMessage &&
    status.isWebhookConfigured;

  return {
    ...status,
    progress,
    isAllComplete,
    isEssentialComplete,
    markFirstMessageSent,
    markPermanentTokenConfirmed,
    refreshStatus,
  };
}
