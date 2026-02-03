#!/usr/bin/env tsx
/**
 * AI Direct Stress Test
 *
 * Testa o processamento de IA diretamente chamando /api/ai/respond
 * sem passar pelo QStash (que não funciona com localhost).
 *
 * Cria conversas temporárias, adiciona mensagens e dispara o processamento.
 *
 * Uso:
 *   npx tsx tests/stress/ai-direct-stress-test.ts
 *   npx tsx tests/stress/ai-direct-stress-test.ts --vus=10 --quick
 */

import { createClient } from '@supabase/supabase-js'

// =============================================================================
// Configuration
// =============================================================================

interface TestConfig {
  targetUrl: string
  vus: number
  messagesPerConversation: number
  requestTimeout: number
}

function parseArgs(): TestConfig {
  const args = process.argv.slice(2)
  const isQuick = args.includes('--quick')
  const vusArg = args.find(a => a.startsWith('--vus='))

  const baseUrl = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'http://localhost:3000'

  let config: TestConfig = {
    targetUrl: baseUrl + '/api/ai/respond',
    vus: isQuick ? 5 : 10,
    messagesPerConversation: isQuick ? 2 : 3,
    requestTimeout: 120000, // 2 min (AI pode demorar)
  }

  if (vusArg) config.vus = parseInt(vusArg.split('=')[1])

  return config
}

// =============================================================================
// Database Setup
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY
const apiKey = process.env.SMARTZAP_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  console.error('Run: source .env.local && npx tsx tests/stress/ai-direct-stress-test.ts')
  process.exit(1)
}

if (!apiKey) {
  console.error('❌ Missing SMARTZAP_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// =============================================================================
// Test Data
// =============================================================================

const TEST_MESSAGES = [
  'Oi, tudo bem? Quero saber mais sobre o produto',
  'Quanto custa o plano básico?',
  'Vocês aceitam pix?',
  'Como funciona a integração?',
  'Preciso falar com um atendente',
  'O sistema está fora do ar?',
  'Quero cancelar',
  'Vocês são confiáveis?',
  'Gostei muito do atendimento!',
  'Não entendi a resposta',
]

// =============================================================================
// Test Helpers
// =============================================================================

interface RequestResult {
  conversationId: string
  turn: number
  success: boolean
  status: number
  latencyMs: number
  aiProcessed: boolean
  skipped: boolean
  error?: string
}

const results: RequestResult[] = []
let startTime: number

function generateTestPhone(index: number): string {
  return `+559988${String(index).padStart(6, '0')}`
}

async function getDefaultAgent(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name')
    .eq('is_active', true)
    .eq('is_default', true)
    .single()

  if (error || !data) {
    console.error('❌ No default agent found:', error)
    return null
  }

  return data
}

async function createTestConversation(phone: string, agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('inbox_conversations')
    .insert({
      phone,
      mode: 'bot',
      ai_agent_id: agentId,
      status: 'open',
      priority: 'normal',
      unread_count: 0,
      total_messages: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('❌ Failed to create conversation:', error)
    return null
  }

  return data.id
}

async function addTestMessage(conversationId: string, message: string): Promise<void> {
  await supabase.from('inbox_messages').insert({
    conversation_id: conversationId,
    direction: 'inbound',
    content: message,
    message_type: 'text',
    delivery_status: 'delivered',
    whatsapp_message_id: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  })

  // Atualiza last_message
  await supabase.from('inbox_conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_preview: message.slice(0, 100),
    total_messages: supabase.rpc('increment_total_messages', { row_id: conversationId }) as unknown as number,
  }).eq('id', conversationId)
}

async function deleteTestConversation(conversationId: string): Promise<void> {
  // Deleta mensagens primeiro
  await supabase.from('inbox_messages').delete().eq('conversation_id', conversationId)
  // Depois a conversa
  await supabase.from('inbox_conversations').delete().eq('id', conversationId)
}

async function callAIRespond(
  conversationId: string,
  turn: number,
  config: TestConfig
): Promise<RequestResult> {
  const requestStart = Date.now()

  try {
    const response = await fetch(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Stress-Test': 'true',
      },
      body: JSON.stringify({ conversationId }),
      signal: AbortSignal.timeout(config.requestTimeout),
    })

    const latencyMs = Date.now() - requestStart
    const body = await response.json()

    return {
      conversationId,
      turn,
      success: response.ok,
      status: response.status,
      latencyMs,
      aiProcessed: body.success === true,
      skipped: body.skipped === true,
      error: body.error,
    }
  } catch (error) {
    const latencyMs = Date.now() - requestStart
    let errorMessage = 'Unknown error'

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        errorMessage = 'Timeout'
      } else {
        errorMessage = error.message
      }
    }

    return {
      conversationId,
      turn,
      success: false,
      status: 0,
      latencyMs,
      aiProcessed: false,
      skipped: false,
      error: errorMessage,
    }
  }
}

// =============================================================================
// Virtual User (conversa com múltiplos turnos)
// =============================================================================

async function runConversation(
  userId: number,
  agentId: string,
  config: TestConfig,
  onProgress: (result: RequestResult) => void
): Promise<string | null> {
  const phone = generateTestPhone(userId)

  // Cria conversa
  const conversationId = await createTestConversation(phone, agentId)
  if (!conversationId) return null

  try {
    for (let turn = 0; turn < config.messagesPerConversation; turn++) {
      // Adiciona mensagem do "usuário"
      const message = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)]
      await addTestMessage(conversationId, message)

      // Chama AI respond
      const result = await callAIRespond(conversationId, turn, config)
      results.push(result)
      onProgress(result)

      // Aguarda entre mensagens
      if (turn < config.messagesPerConversation - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  } finally {
    // Cleanup
    await deleteTestConversation(conversationId)
  }

  return conversationId
}

// =============================================================================
// Report
// =============================================================================

function generateReport(config: TestConfig): void {
  const totalDuration = Date.now() - startTime

  const aiProcessedResults = results.filter(r => r.aiProcessed)
  const skippedResults = results.filter(r => r.skipped)
  const errorResults = results.filter(r => !r.success)
  const successResults = results.filter(r => r.success)

  const latencies = aiProcessedResults.map(r => r.latencyMs).sort((a, b) => a - b)
  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0
  const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0
  const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0
  const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              AI DIRECT STRESS TEST REPORT                        ║
╠══════════════════════════════════════════════════════════════════╣
║  Target: ${config.targetUrl.padEnd(53)}║
║  VUs (conversas paralelas): ${config.vus.toString().padEnd(34)}║
║  Messages per conversation: ${config.messagesPerConversation.toString().padEnd(34)}║
╠══════════════════════════════════════════════════════════════════╣
║                         RESULTS                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Requests: ${results.length.toString().padEnd(44)}║
║  ✅ HTTP Success: ${successResults.length.toString().padEnd(43)}║
║  ❌ HTTP Errors: ${errorResults.length.toString().padEnd(44)}║
║  🤖 AI Processed: ${aiProcessedResults.length.toString().padEnd(43)}║
║  ⏭️  Skipped: ${skippedResults.length.toString().padEnd(48)}║
╠══════════════════════════════════════════════════════════════════╣
║                    AI LATENCY (processed only)                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Average: ${avgLatency.toFixed(0)}ms`.padEnd(64) + `║
║  P50: ${p50}ms`.padEnd(64) + `║
║  P95: ${p95}ms`.padEnd(64) + `║
║  P99: ${p99}ms`.padEnd(64) + `║
║  Max: ${latencies.length > 0 ? Math.max(...latencies) : 0}ms`.padEnd(64) + `║
╠══════════════════════════════════════════════════════════════════╣
║  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`.padEnd(64) + `║
║  Throughput: ${(results.length / (totalDuration / 1000)).toFixed(2)} req/s`.padEnd(64) + `║
╚══════════════════════════════════════════════════════════════════╝
`)

  // Análise de erros
  if (errorResults.length > 0) {
    console.log('\n⚠️  ERROS ENCONTRADOS:')
    const errorCounts: Record<string, number> = {}
    for (const r of errorResults) {
      const key = r.error || 'Unknown'
      errorCounts[key] = (errorCounts[key] || 0) + 1
    }
    for (const [error, count] of Object.entries(errorCounts)) {
      console.log(`   ${count}x ${error}`)
    }
  }

  if (skippedResults.length > 0) {
    console.log(`\nℹ️  ${skippedResults.length} requests foram "skipped" (debounce, modo não-bot, etc.)`)
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const config = parseArgs()

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
AI Direct Stress Test

Testa o processamento de IA diretamente, sem QStash.

Uso:
  source .env.local && npx tsx tests/stress/ai-direct-stress-test.ts [opções]

Opções:
  --target=URL       Base URL (default: http://localhost:3000)
  --vus=N            Conversas paralelas (default: 10)
  --quick            Teste rápido (5 VUs, 2 msgs/conv)
  -h, --help         Ajuda
`)
    process.exit(0)
  }

  // Verifica agent
  const agent = await getDefaultAgent()
  if (!agent) {
    console.error('❌ No active default agent found. Configure one first.')
    process.exit(1)
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  AI DIRECT STRESS TEST                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Target: ${config.targetUrl.padEnd(53)}║
║  Agent: ${agent.name.padEnd(54)}║
║  VUs: ${config.vus.toString().padEnd(56)}║
║  Messages/conversation: ${config.messagesPerConversation.toString().padEnd(38)}║
║  Expected requests: ${(config.vus * config.messagesPerConversation).toString().padEnd(42)}║
╚══════════════════════════════════════════════════════════════════╝

🚀 Iniciando teste...
`)

  startTime = Date.now()

  let completed = 0
  let aiCount = 0
  let errorCount = 0

  const onProgress = (result: RequestResult) => {
    completed++
    if (result.aiProcessed) aiCount++
    if (!result.success) errorCount++

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    process.stdout.write(
      `\r⏳ ${elapsed}s | ${completed}/${config.vus * config.messagesPerConversation} | 🤖 AI: ${aiCount} | ❌ Errors: ${errorCount}   `
    )
  }

  // Lança todas as conversas em paralelo
  const conversations = []
  for (let i = 0; i < config.vus; i++) {
    conversations.push(runConversation(i, agent.id, config, onProgress))
  }

  await Promise.all(conversations)

  // Clear progress
  process.stdout.write('\r' + ' '.repeat(80) + '\r')

  // Report
  generateReport(config)

  // Exit code
  const errorRate = results.length > 0
    ? (results.filter(r => !r.success).length / results.length) * 100
    : 0

  if (errorRate > 5) {
    console.log('\n❌ TESTE FALHOU: Taxa de erro acima de 5%')
    process.exit(1)
  }

  console.log('\n✅ TESTE PASSOU!')
}

main().catch(error => {
  console.error('Erro fatal:', error)
  process.exit(1)
})
