/**
 * Inbox AI Workflow Endpoint
 *
 * Endpoint Upstash Workflow para processamento durável de IA no inbox.
 * Usa serve() que gerencia automaticamente:
 * - Verificação de assinatura QStash
 * - Retry em caso de falha
 * - Persistência de estado entre steps
 *
 * Disparo: via Client.trigger() no inbox-webhook.ts
 */

import { serve } from '@upstash/workflow/nextjs'
import { processInboxAIWorkflow } from '@/lib/inbox/inbox-ai-workflow'

export const { POST } = serve(processInboxAIWorkflow, {
  // Retry com backoff exponencial
  retries: 3,
})
