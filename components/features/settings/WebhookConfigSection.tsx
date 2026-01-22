'use client';

import React, { useState } from 'react';
import { Webhook, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PhoneNumber } from '../../../hooks/useSettings';
import { Container } from '@/components/ui/container';
import { SectionHeader } from '@/components/ui/section-header';

import {
  WebhookUrlConfig,
  PhoneNumbersList,
  WebhookLevelsExplanation,
  WebhookStats,
  DomainOption,
  WebhookSubscription,
} from './webhook';

export interface WebhookConfigSectionProps {
  webhookUrl?: string;
  webhookToken?: string;
  webhookStats?: WebhookStats | null;
  webhookPath?: string;
  webhookSubscription?: WebhookSubscription | null;
  webhookSubscriptionLoading?: boolean;
  webhookSubscriptionMutating?: boolean;
  onRefreshWebhookSubscription?: () => void;
  onSubscribeWebhookMessages?: (callbackUrl?: string) => Promise<void>;
  onUnsubscribeWebhookMessages?: () => Promise<void>;
  phoneNumbers?: PhoneNumber[];
  phoneNumbersLoading?: boolean;
  onRefreshPhoneNumbers?: () => void;
  onSetWebhookOverride?: (phoneNumberId: string, callbackUrl: string) => Promise<boolean>;
  onRemoveWebhookOverride?: (phoneNumberId: string) => Promise<boolean>;
  availableDomains?: DomainOption[];
}

export function WebhookConfigSection({
  webhookUrl,
  webhookToken,
  webhookStats,
  webhookPath,
  webhookSubscriptionMutating,
  onRefreshWebhookSubscription,
  onSubscribeWebhookMessages,
  onUnsubscribeWebhookMessages,
  phoneNumbers,
  phoneNumbersLoading,
  onRefreshPhoneNumbers,
  onSetWebhookOverride,
  onRemoveWebhookOverride,
  availableDomains,
}: WebhookConfigSectionProps) {
  // Local states
  const [selectedDomainUrl, setSelectedDomainUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isTestingUrl, setIsTestingUrl] = useState(false);

  // Computed webhook URL based on domain selection
  const defaultPath = '/api/webhook';
  const computedWebhookUrl = selectedDomainUrl
    ? selectedDomainUrl + (webhookPath || defaultPath)
    : webhookUrl;

  // Handlers
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleSetZapflowWebhook = async (phoneNumberId: string) => {
    const urlToSet = computedWebhookUrl;
    if (!urlToSet) return;

    setIsSavingOverride(true);
    try {
      await onSetWebhookOverride?.(phoneNumberId, urlToSet);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleRemoveOverride = async (phoneNumberId: string) => {
    setIsSavingOverride(true);
    try {
      await onRemoveWebhookOverride?.(phoneNumberId);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleSetCustomOverride = async (phoneNumberId: string, url: string) => {
    if (!url.trim()) {
      toast.error('Digite a URL do webhook');
      return;
    }

    if (!url.startsWith('https://')) {
      toast.error('A URL deve começar com https://');
      return;
    }

    const success = await onSetWebhookOverride?.(phoneNumberId, url.trim());
    return success;
  };

  const handleTestUrl = async () => {
    if (!computedWebhookUrl || !webhookToken) {
      toast.error('Webhook URL ou token ausente');
      return;
    }
    setIsTestingUrl(true);
    try {
      const res = await fetch('/api/debug/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: computedWebhookUrl, token: webhookToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        toast.success('Webhook OK!', { description: 'A URL respondeu corretamente.' });
        return;
      }
      const status = data?.status ? `status ${data.status}` : 'Falha';
      const hint = data?.message || data?.error || 'Resposta inválida';
      toast.error(`Webhook não respondeu (${status})`, { description: hint });
    } catch {
      toast.error('Erro ao testar URL do webhook');
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Handler para ativar WABA - passa a URL computada (ex: ngrok)
  const handleActivateWaba = async () => {
    if (!computedWebhookUrl) {
      toast.error('URL do webhook não configurada');
      return;
    }
    await onSubscribeWebhookMessages?.(computedWebhookUrl);
    // Refresh phone numbers para atualizar o funil com os novos dados
    onRefreshPhoneNumbers?.();
    onRefreshWebhookSubscription?.();
  };

  // Handler para desativar WABA
  const handleDeactivateWaba = async () => {
    await onUnsubscribeWebhookMessages?.();
    // Refresh phone numbers para atualizar o funil
    onRefreshPhoneNumbers?.();
    onRefreshWebhookSubscription?.();
  };

  return (
    <Container variant="glass" padding="lg">
      {/* Header */}
      <SectionHeader
        title="Webhooks"
        icon={Webhook}
        color="info"
        showIndicator={true}
        actions={
          phoneNumbers && phoneNumbers.length > 0 ? (
            <button
              onClick={onRefreshPhoneNumbers}
              disabled={phoneNumbersLoading}
              className="p-2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)] rounded-lg transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw size={16} className={phoneNumbersLoading ? 'animate-spin' : ''} />
            </button>
          ) : undefined
        }
      />

      <p className="text-sm text-[var(--ds-text-secondary)] mt-4 mb-6">
        Webhooks são notificações que a Meta envia quando algo acontece (mensagem entregue, lida, etc).
        Expanda o funil de cada número para configurar em qual nível o SmartZap captura os eventos.
      </p>

      {/* SmartZap Webhook URL Config */}
      <WebhookUrlConfig
        webhookUrl={computedWebhookUrl}
        webhookToken={webhookToken}
        webhookStats={webhookStats}
        availableDomains={availableDomains}
        selectedDomainUrl={selectedDomainUrl}
        onDomainChange={setSelectedDomainUrl}
        copiedField={copiedField}
        onCopy={handleCopy}
        onTestUrl={handleTestUrl}
        isTestingUrl={isTestingUrl}
        showTestUrl={process.env.NODE_ENV === 'development'}
      />

      {/* Phone Numbers List with inline funnel actions */}
      {phoneNumbers && phoneNumbers.length > 0 && (
        <PhoneNumbersList
          phoneNumbers={phoneNumbers}
          phoneNumbersLoading={phoneNumbersLoading}
          computedWebhookUrl={computedWebhookUrl}
          isSavingOverride={isSavingOverride}
          onSetZapflowWebhook={handleSetZapflowWebhook}
          onRemoveOverride={handleRemoveOverride}
          onSetCustomOverride={handleSetCustomOverride}
          onActivateWaba={handleActivateWaba}
          onDeactivateWaba={handleDeactivateWaba}
          isWabaBusy={webhookSubscriptionMutating}
        />
      )}

      {/* Webhook Levels Explanation */}
      <WebhookLevelsExplanation />
    </Container>
  );
}
