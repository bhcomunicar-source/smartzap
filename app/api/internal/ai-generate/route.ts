/**
 * Internal AI Generate Route
 *
 * Rota interna para processamento de IA do inbox.
 * Chamada via context.call() do Upstash Workflow para evitar que
 * a função serverless fique "presa" esperando a resposta da IA.
 *
 * Benefícios de usar context.call():
 * - Upstash faz a chamada HTTP (não consome compute da sua função)
 * - Timeout de até 2 horas
 * - Retries automáticos
 * - Flow control (rate limiting)
 *
 * Segurança: Protegida por SMARTZAP_API_KEY no header x-api-key
 */

import { NextRequest, NextResponse } from 'next/server'
import { processChatAgent, type SupportAgentConfig, type SupportAgentResult } from '@/lib/ai/agents/chat-agent'

// Desabilita bodyParser do Next.js para controle manual
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutos - máximo do Vercel Pro

export async function POST(req: NextRequest) {
  // Valida chave de API interna
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = process.env.SMARTZAP_API_KEY

  if (!apiKey || apiKey !== expectedKey) {
    console.error('[ai-generate] Unauthorized: invalid or missing API key')
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json() as SupportAgentConfig

    // Valida payload
    if (!body.agent || !body.conversation || !body.messages) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: agent, conversation, messages' },
        { status: 400 }
      )
    }

    console.log(`[ai-generate] Processing: conversation=${body.conversation.id}, agent=${body.agent.name}, messages=${body.messages.length}`)

    // Processa com o chat agent
    const result: SupportAgentResult = await processChatAgent(body)

    console.log(`[ai-generate] Completed in ${result.latencyMs}ms, success: ${result.success}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ai-generate] Error processing request:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        latencyMs: 0,
      } satisfies SupportAgentResult,
      { status: 500 }
    )
  }
}
