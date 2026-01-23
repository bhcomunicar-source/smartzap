/**
 * Inbox AI Workflow - Processamento Durável de IA
 *
 * Usa Upstash Workflow para processar mensagens do inbox com debounce durável.
 * Resolve o problema do setTimeout que não sobrevive à morte da função serverless.
 *
 * IMPORTANTE: Usa context.call() para chamadas de IA
 * - context.run() → função serverless ESPERA (consome compute)
 * - context.call() → UPSTASH espera (não consome compute, até 2h timeout)
 *
 * Fluxo:
 * 1. Webhook recebe mensagem → dispara workflow
 * 2. Workflow espera (context.sleep) para acumular mensagens
 * 3. Verifica estado da conversa (context.run)
 * 4. Processa com IA via API interna (context.call) ← DURÁVEL
 * 5. Envia resposta via WhatsApp
 */

import type { WorkflowContext } from '@upstash/workflow'
import { getRedis, REDIS_KEYS } from '@/lib/upstash/redis'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'
import type { SupportAgentResult } from '@/lib/ai/agents/chat-agent'

// Constantes
const DEBOUNCE_SECONDS = 2
const MAX_DEBOUNCE_LOOPS = 10 // Evita loop infinito (máx 50s de espera)
const AI_CALL_TIMEOUT_SECONDS = 120 // 2 minutos para chamada de IA
const AI_CALL_RETRIES = 2 // Número de retries em caso de falha

// =============================================================================
// Types
// =============================================================================

export interface InboxAIWorkflowPayload {
  /** ID da conversa no inbox */
  conversationId: string
  /** Timestamp de quando o workflow foi disparado */
  triggeredAt: number
  /** ID do agente de IA a usar (ou usa default) */
  agentId?: string
}

// =============================================================================
// Main Workflow Function
// =============================================================================

/**
 * Workflow principal de processamento de IA do inbox.
 * Chamado via POST /api/inbox/ai-workflow
 */
export async function processInboxAIWorkflow(context: WorkflowContext) {
  const payload = context.requestPayload as InboxAIWorkflowPayload
  const { conversationId } = payload

  console.log(`[inbox-ai-workflow] Starting for conversation ${conversationId}`)

  // =========================================================================
  // Step 1: Debounce simples - espera única de 5s
  // =========================================================================
  // TODO: Reativar loop de debounce quando latência não for problema

  await context.sleep('debounce-wait', `${DEBOUNCE_SECONDS}s`)
  console.log(`[inbox-ai-workflow] Debounce complete after ${DEBOUNCE_SECONDS}s`)

  // =========================================================================
  // Step 2: Verificar estado da conversa e buscar dados
  // =========================================================================

  const fetchResult = await context.run('fetch-conversation-and-agent', async () => {
    const { inboxDb } = await import('./inbox-db')
    const { getSupabaseAdmin } = await import('@/lib/supabase')

    // Busca conversa
    const conversationData = await inboxDb.getConversation(conversationId)
    if (!conversationData) {
      return { valid: false as const, reason: 'conversation-not-found' }
    }

    // Verifica se ainda está em modo bot
    if (conversationData.mode !== 'bot') {
      return { valid: false as const, reason: 'not-in-bot-mode', mode: conversationData.mode }
    }

    // Verifica se automação está pausada
    if (conversationData.automation_paused_until) {
      const pauseTime = new Date(conversationData.automation_paused_until).getTime()
      if (pauseTime > Date.now()) {
        return { valid: false as const, reason: 'automation-paused' }
      }
    }

    // Busca agente
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return { valid: false as const, reason: 'supabase-not-configured' }
    }

    let agentData: AIAgent | null = null

    // Primeiro tenta agente específico da conversa
    if (conversationData.ai_agent_id) {
      const { data } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', conversationData.ai_agent_id)
        .single()
      agentData = data as AIAgent | null
    }

    // Se não tem, busca default
    if (!agentData) {
      const { data } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', true)
        .single()
      agentData = data as AIAgent | null
    }

    if (!agentData) {
      return { valid: false as const, reason: 'no-agent-configured' }
    }

    if (!agentData.is_active) {
      return { valid: false as const, reason: 'agent-not-active' }
    }

    // Valida que o agente tem system_prompt configurado
    if (!agentData.system_prompt || agentData.system_prompt.trim().length < 10) {
      return { valid: false as const, reason: 'agent-missing-system-prompt' }
    }

    // Busca mensagens recentes
    const { messages: messagesData } = await inboxDb.listMessages(conversationId, { limit: 20 })

    return {
      valid: true as const,
      conversation: conversationData,
      agent: agentData,
      messages: messagesData,
    }
  })

  // Se não é válido, faz cleanup e retorna
  if (!fetchResult.valid) {
    console.log(`[inbox-ai-workflow] Skipping AI processing: ${fetchResult.reason}`)

    await context.run('cleanup-invalid', async () => {
      const redis = getRedis()
      if (redis) {
        await redis.del(REDIS_KEYS.inboxLastMessage(conversationId))
        await redis.del(REDIS_KEYS.inboxWorkflowPending(conversationId))
      }
    })

    return { status: 'skipped', reason: fetchResult.reason }
  }

  // Extrai dados com tipos garantidos
  const conversation = fetchResult.conversation
  const agent = fetchResult.agent
  const messages = fetchResult.messages

  // =========================================================================
  // Step 3: Processar com IA via context.call()
  // =========================================================================
  // IMPORTANTE: Usamos context.call() em vez de context.run() porque:
  // - context.run() → função serverless ESPERA a IA (consome compute)
  // - context.call() → UPSTASH faz a chamada HTTP (não consome compute)
  //
  // Benefícios:
  // - Timeout de até 2 horas (vs limite da plataforma)
  // - Retries automáticos
  // - Função não fica "travada" esperando
  // =========================================================================

  // Monta URL da API interna
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (!baseUrl) {
    console.error('[inbox-ai-workflow] No base URL configured (NEXT_PUBLIC_APP_URL or VERCEL_URL)')
    return { status: 'error', error: 'No base URL configured' }
  }

  const aiApiUrl = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/internal/ai-generate`
  const apiKey = process.env.SMARTZAP_API_KEY || ''
  console.log(`[inbox-ai-workflow] Calling AI API: ${aiApiUrl}`)
  console.log(`[inbox-ai-workflow] Payload: agent=${agent.name}, messages=${messages.length}, apiKey=${apiKey ? 'present' : 'MISSING'}`)

  const aiCallResult = await context.call<SupportAgentResult>('process-ai', {
    url: aiApiUrl,
    method: 'POST',
    body: {
      agent,
      conversation,
      messages,
    },
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    timeout: AI_CALL_TIMEOUT_SECONDS,
    retries: AI_CALL_RETRIES,
  })

  console.log(`[inbox-ai-workflow] AI API returned status: ${aiCallResult.status}`)

  // Processa resultado da chamada HTTP
  const aiResult = (() => {
    // Verifica se a chamada HTTP foi bem-sucedida
    if (aiCallResult.status !== 200) {
      console.error(`[inbox-ai-workflow] AI API returned status ${aiCallResult.status}:`, aiCallResult.body)
      return {
        success: false,
        error: `AI API error: status ${aiCallResult.status}`,
      }
    }

    // Extrai resultado do body
    const result = aiCallResult.body as SupportAgentResult

    return {
      success: result.success,
      message: result.response?.message,
      sentiment: result.response?.sentiment,
      shouldHandoff: result.response?.shouldHandoff,
      handoffReason: result.response?.handoffReason,
      handoffSummary: result.response?.handoffSummary,
      sources: result.response?.sources,
      logId: result.logId,
      error: result.error,
    }
  })()

  if (!aiResult.success || !aiResult.message) {
    console.log(`[inbox-ai-workflow] AI processing failed: ${aiResult.error}`)

    // Auto-handoff em caso de erro
    if (aiResult.error) {
      await context.run('auto-handoff-error', async () => {
        const { inboxDb } = await import('./inbox-db')
        const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send')

        // Envia mensagem de fallback
        const fallbackMessage =
          'Desculpe, estou com dificuldades técnicas. Vou transferir você para um atendente.'

        const sendResult = await sendWhatsAppMessage({
          to: conversation.phone,
          type: 'text',
          text: fallbackMessage,
        })

        if (sendResult.success && sendResult.messageId) {
          await inboxDb.createMessage({
            conversation_id: conversationId,
            direction: 'outbound',
            content: fallbackMessage,
            message_type: 'text',
            whatsapp_message_id: sendResult.messageId,
            delivery_status: 'sent',
          })
        }

        // Switch para modo humano
        await inboxDb.updateConversation(conversationId, { mode: 'human' })

        // Cria nota interna
        await inboxDb.createMessage({
          conversation_id: conversationId,
          direction: 'outbound',
          content: `🤖 **Transferência automática**\n\n**Motivo:** Erro técnico: ${aiResult.error}`,
          message_type: 'internal_note',
          delivery_status: 'delivered',
        })
      })
    }

    await context.run('cleanup-error', async () => {
      const redis = getRedis()
      if (redis) {
        await redis.del(REDIS_KEYS.inboxLastMessage(conversationId))
        await redis.del(REDIS_KEYS.inboxWorkflowPending(conversationId))
      }
    })

    return { status: 'error', error: aiResult.error }
  }

  // =========================================================================
  // Step 4: Enviar resposta via WhatsApp
  // =========================================================================

  await context.run('send-response', async () => {
    const { inboxDb } = await import('./inbox-db')
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send')

    const sendResult = await sendWhatsAppMessage({
      to: conversation.phone,
      type: 'text',
      text: aiResult.message!,
    })

    if (sendResult.success && sendResult.messageId) {
      await inboxDb.createMessage({
        conversation_id: conversationId,
        direction: 'outbound',
        content: aiResult.message!,
        message_type: 'text',
        whatsapp_message_id: sendResult.messageId,
        delivery_status: 'sent',
        ai_response_id: aiResult.logId || null,
        ai_sentiment: aiResult.sentiment,
        ai_sources: aiResult.sources || null,
      })
      console.log(`[inbox-ai-workflow] Response sent: ${sendResult.messageId}`)
    } else {
      console.error(`[inbox-ai-workflow] Failed to send response:`, sendResult.error)
    }

    return sendResult
  })

  // =========================================================================
  // Step 5: Handle handoff (se necessário)
  // =========================================================================

  if (aiResult.shouldHandoff) {
    await context.run('handle-handoff', async () => {
      const { inboxDb } = await import('./inbox-db')

      console.log(`[inbox-ai-workflow] AI requested handoff: ${aiResult.handoffReason}`)

      // Switch para modo humano
      await inboxDb.updateConversation(conversationId, { mode: 'human' })

      // Cria nota interna sobre handoff
      await inboxDb.createMessage({
        conversation_id: conversationId,
        direction: 'outbound',
        content: `🤖 **Transferência para atendente**\n\n${aiResult.handoffReason ? `**Motivo:** ${aiResult.handoffReason}\n` : ''}${aiResult.handoffSummary ? `**Resumo:** ${aiResult.handoffSummary}` : ''}`,
        message_type: 'internal_note',
        delivery_status: 'delivered',
        payload: {
          type: 'ai_handoff',
          reason: aiResult.handoffReason,
          summary: aiResult.handoffSummary,
          timestamp: new Date().toISOString(),
        },
      })
    })
  }

  // =========================================================================
  // Step 6: Cleanup
  // =========================================================================

  await context.run('cleanup-success', async () => {
    const redis = getRedis()
    if (redis) {
      await redis.del(REDIS_KEYS.inboxLastMessage(conversationId))
      await redis.del(REDIS_KEYS.inboxWorkflowPending(conversationId))
    }
  })

  console.log(`[inbox-ai-workflow] Completed successfully for ${conversationId}`)

  return {
    status: 'completed',
    conversationId,
    sentiment: aiResult.sentiment,
    handoff: aiResult.shouldHandoff,
  }
}
