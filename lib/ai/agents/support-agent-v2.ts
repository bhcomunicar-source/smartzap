/**
 * Support Agent V2 - Using AI SDK v6 patterns
 * Uses streamText + tools for structured output
 * Includes File Search (RAG) integration for knowledge base queries
 */

import { streamText, tool } from 'ai'
import { z } from 'zod'
import { createGoogleGenerativeAI, type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase-server'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface SupportAgentConfig {
  /** AI Agent configuration from database */
  agent: AIAgent
  /** Conversation context */
  conversation: InboxConversation
  /** Recent messages for context */
  messages: InboxMessage[]
}

export interface SupportAgentResult {
  success: boolean
  response?: SupportResponse
  error?: string
  /** Time taken in milliseconds */
  latencyMs: number
  /** Log ID for reference */
  logId?: string
}

// =============================================================================
// Response Schema (Tool Parameters)
// =============================================================================

const supportResponseSchema = z.object({
  message: z.string().describe('A resposta para enviar ao usuário'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative', 'frustrated'])
    .describe('Sentimento detectado na mensagem do usuário'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Nível de confiança na resposta (0 = incerto, 1 = certo)'),
  shouldHandoff: z
    .boolean()
    .describe('Se deve transferir para um atendente humano'),
  handoffReason: z
    .string()
    .optional()
    .describe('Motivo da transferência para humano'),
  handoffSummary: z
    .string()
    .optional()
    .describe('Resumo da conversa para o atendente'),
  sources: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      })
    )
    .optional()
    .describe('Fontes utilizadas para gerar a resposta'),
})

export type SupportResponse = z.infer<typeof supportResponseSchema>

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_MODEL_ID = 'gemini-2.0-flash'
const DEFAULT_MAX_TOKENS = 2048
const DEFAULT_TEMPERATURE = 0.7

// =============================================================================
// System Prompt Builder
// =============================================================================

function buildSystemPrompt(
  agent: AIAgent,
  conversation: InboxConversation,
  hasKnowledgeBase: boolean
): string {
  const contactName = conversation.contact?.name || 'Cliente'

  const knowledgeBaseInstructions = hasKnowledgeBase
    ? `
KNOWLEDGE BASE (BASE DE CONHECIMENTO):
Você tem acesso a uma base de conhecimento com documentos relevantes.
- A ferramenta "file_search" será usada automaticamente para buscar informações
- SEMPRE baseie suas respostas nas informações encontradas na base de conhecimento
- Cite as fontes quando usar informações da base de conhecimento
- Se a informação não estiver na base, informe ao cliente que vai verificar`
    : `
NOTA: Este agente não possui base de conhecimento configurada.
Responda com base no contexto da conversa e no seu conhecimento geral.`

  return `${agent.system_prompt}

CONTEXTO DA CONVERSA:
- Nome do cliente: ${contactName}
- Telefone: ${conversation.phone}
- Prioridade: ${conversation.priority || 'normal'}
- Total de mensagens: ${conversation.total_messages}
${knowledgeBaseInstructions}

INSTRUÇÕES IMPORTANTES:
1. Responda sempre em português do Brasil
2. Seja educado, profissional e empático
3. Se não souber a resposta, admita e ofereça alternativas
4. Detecte o sentimento do cliente (positivo, neutro, negativo, frustrado)
5. Se o cliente estiver frustrado ou pedir para falar com humano, defina shouldHandoff como true
6. Inclua as fontes utilizadas quando aplicável (especialmente da base de conhecimento)

CRITÉRIOS PARA TRANSFERÊNCIA (shouldHandoff = true):
- Cliente explicitamente pede para falar com atendente/humano
- Cliente expressa frustração repetida (3+ mensagens negativas)
- Assunto sensível (reclamação formal, problema financeiro, dados pessoais)
- Você não consegue ajudar após 2 tentativas
- Detecção de urgência real (emergência, prazo crítico)

IMPORTANTE: Você DEVE usar a ferramenta "respond" para enviar sua resposta.`
}

// =============================================================================
// AI Log Persistence
// =============================================================================

interface AILogData {
  conversationId: string
  agentId: string
  messageIds: string[]
  input: string
  output: SupportResponse | null
  latencyMs: number
  error: string | null
  modelUsed: string
}

async function persistAILog(data: AILogData): Promise<string | undefined> {
  try {
    const supabase = await createClient()

    const { data: log, error } = await supabase
      .from('ai_agent_logs')
      .insert({
        conversation_id: data.conversationId,
        ai_agent_id: data.agentId,
        input_message: data.input,
        output_message: data.output?.message || null,
        response_time_ms: data.latencyMs,
        model_used: data.modelUsed,
        tokens_used: null,
        sources_used: data.output?.sources || null,
        error_message: data.error,
        metadata: {
          messageIds: data.messageIds,
          sentiment: data.output?.sentiment,
          confidence: data.output?.confidence,
          shouldHandoff: data.output?.shouldHandoff,
          handoffReason: data.output?.handoffReason,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('[AI Log] Failed to persist:', error)
      return undefined
    }

    return log?.id
  } catch (err) {
    console.error('[AI Log] Error:', err)
    return undefined
  }
}

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Convert inbox messages to AI SDK message format
 */
function convertToAIMessages(
  messages: InboxMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.message_type !== 'internal_note')
    .map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))
}

// =============================================================================
// Support Agent Core (V2 - AI SDK Patterns)
// =============================================================================

/**
 * Process a conversation with the support agent using AI SDK v6 patterns
 * Uses streamText + tools for structured output
 * Includes File Search (RAG) when agent has knowledge base configured
 */
export async function processSupportAgentV2(
  config: SupportAgentConfig
): Promise<SupportAgentResult> {
  const { agent, conversation, messages } = config
  const startTime = Date.now()

  // Get API key
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'AI API key not configured',
      latencyMs: Date.now() - startTime,
    }
  }

  // Get the last user message for input logging
  const lastUserMessage = messages
    .filter((m) => m.direction === 'inbound')
    .slice(-1)[0]
  const inputText = lastUserMessage?.content || ''
  const messageIds = messages.map((m) => m.id)

  // Convert messages to AI SDK format (last 10 for context)
  const aiMessages = convertToAIMessages(messages.slice(-10))

  // Create model provider
  const google = createGoogleGenerativeAI({ apiKey })
  const modelId = agent.model || DEFAULT_MODEL_ID
  const model = google(modelId)

  // Check if agent has a knowledge base configured
  const hasKnowledgeBase = !!agent.file_search_store_id

  let response: SupportResponse | undefined
  let error: string | null = null
  let groundingSources: Array<{ title: string; content: string }> = []

  try {
    // Log knowledge base status
    if (hasKnowledgeBase && agent.file_search_store_id) {
      console.log(`[AI Agent V2] Enabling File Search with store: ${agent.file_search_store_id}`)
    }

    // Define the respond tool
    const respondTool = tool({
      description: 'Envia uma resposta estruturada ao usuário. SEMPRE use esta ferramenta após processar a mensagem.',
      inputSchema: supportResponseSchema,
      execute: async (params) => {
        // Store the response for later use
        response = params
        return params
      },
    })

    // Use streamText with tools for structured output
    // File Search tool is added conditionally when agent has knowledge base
    const result = streamText({
      model,
      system: buildSystemPrompt(agent, conversation, hasKnowledgeBase),
      messages: aiMessages,
      tools: {
        respond: respondTool,
        // Conditionally add file_search tool if knowledge base is configured
        ...(hasKnowledgeBase && agent.file_search_store_id
          ? {
              file_search: google.tools.fileSearch({
                fileSearchStoreNames: [agent.file_search_store_id],
                topK: 5, // Retrieve top 5 most relevant chunks
              }),
            }
          : {}),
      },
      toolChoice: 'required',
      temperature: DEFAULT_TEMPERATURE,
      maxOutputTokens: DEFAULT_MAX_TOKENS,
    })

    // Consume the stream completely (we don't need streaming, just the result)
    // This processes the tool call and triggers the execute function
    for await (const _part of result.fullStream) {
      // Just consume the stream
    }

    // Extract grounding metadata if available (from File Search)
    const providerMetadata = (await result.providerMetadata) as GoogleGenerativeAIProviderMetadata | undefined
    const groundingMetadata = providerMetadata?.groundingMetadata

    if (groundingMetadata?.groundingChunks) {
      groundingSources = groundingMetadata.groundingChunks
        .filter((chunk) => chunk.retrievedContext)
        .map((chunk) => ({
          title: chunk.retrievedContext?.title || 'Documento',
          content: chunk.retrievedContext?.text || '',
        }))

      console.log(`[AI Agent V2] Found ${groundingSources.length} grounding sources from knowledge base`)
    }

    // If no response was captured, something went wrong
    if (!response) {
      throw new Error('No response generated from AI')
    }

    // Merge grounding sources with any sources from the response
    if (groundingSources.length > 0) {
      response.sources = [...(response.sources || []), ...groundingSources]
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AI Agent V2] Error:', error)
  }

  const latencyMs = Date.now() - startTime

  // If we have a response, persist the log and return success
  if (response) {
    const logId = await persistAILog({
      conversationId: conversation.id,
      agentId: agent.id,
      messageIds,
      input: inputText,
      output: response,
      latencyMs,
      error: null,
      modelUsed: modelId,
    })

    return {
      success: true,
      response,
      latencyMs,
      logId,
    }
  }

  // Error case - create auto-handoff response
  const handoffResponse: SupportResponse = {
    message:
      'Desculpe, estou com dificuldades técnicas no momento. Vou transferir você para um de nossos atendentes.',
    sentiment: 'neutral',
    confidence: 0,
    shouldHandoff: true,
    handoffReason: `Erro técnico: ${error}`,
    handoffSummary: `Cliente estava conversando quando ocorreu erro técnico. Última mensagem: "${inputText.slice(0, 200)}"`,
  }

  const logId = await persistAILog({
    conversationId: conversation.id,
    agentId: agent.id,
    messageIds,
    input: inputText,
    output: handoffResponse,
    latencyMs,
    error,
    modelUsed: modelId,
  })

  return {
    success: false,
    response: handoffResponse,
    error: error || 'Unknown error',
    latencyMs,
    logId,
  }
}
