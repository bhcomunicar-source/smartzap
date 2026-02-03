#!/usr/bin/env tsx
/**
 * AI Chat Stress Test
 *
 * Testa o sistema de chat com IA sob carga para encontrar:
 * - Race conditions
 * - Memory leaks
 * - Timeouts
 * - Erros de concorrência
 * - Problemas de rate limiting
 *
 * Uso:
 *   npx tsx tests/stress/ai-stress-test.ts
 *   npx tsx tests/stress/ai-stress-test.ts --vus=20 --turns=5
 *   npx tsx tests/stress/ai-stress-test.ts --aggressive
 */

import { generateWebhookPayload, generateUniquePhone, getRandomMessage } from './webhook-payload'

// =============================================================================
// Configuration
// =============================================================================

interface TestConfig {
  targetUrl: string
  vus: number // Virtual users (conversas paralelas)
  turnsPerConversation: number // Mensagens por conversa
  thinkTime: number // ms entre mensagens do mesmo usuário
  requestTimeout: number // ms
}

function parseArgs(): TestConfig {
  const args = process.argv.slice(2)

  // Profiles
  const isAggressive = args.includes('--aggressive')
  const isQuick = args.includes('--quick')

  // Custom values
  const vusArg = args.find(a => a.startsWith('--vus='))
  const turnsArg = args.find(a => a.startsWith('--turns='))
  const targetArg = args.find(a => a.startsWith('--target='))

  let config: TestConfig = {
    targetUrl: targetArg?.split('=')[1] || 'http://localhost:3001/api/webhook',
    vus: 10,
    turnsPerConversation: 4,
    thinkTime: 500,
    requestTimeout: 60000,
  }

  if (isQuick) {
    config = { ...config, vus: 5, turnsPerConversation: 2 }
  } else if (isAggressive) {
    config = { ...config, vus: 50, turnsPerConversation: 5, thinkTime: 200 }
  }

  // Override with custom args
  if (vusArg) config.vus = parseInt(vusArg.split('=')[1])
  if (turnsArg) config.turnsPerConversation = parseInt(turnsArg.split('=')[1])

  return config
}

// =============================================================================
// Metrics
// =============================================================================

interface RequestResult {
  phone: string
  turn: number
  success: boolean
  status: number
  latencyMs: number
  error?: string
  errorCode?: string
}

const results: RequestResult[] = []
let startTime: number

// =============================================================================
// Test Messages (simulam conversa real)
// =============================================================================

const CONVERSATION_FLOWS = [
  ['Oi, tudo bem?', 'Quero saber sobre os planos', 'Qual o preço?', 'Tem desconto?', 'Vou pensar'],
  ['Olá!', 'Como funciona o WhatsApp marketing?', 'Vocês fazem a integração?', 'Preciso de ajuda'],
  ['Boa tarde', 'Tenho uma dúvida técnica', 'O sistema está fora do ar?', 'Preciso falar com suporte'],
  ['Ei', 'Vi o anúncio de vocês', 'É confiável?', 'Quero testar', 'Como começo?'],
  ['Hello', 'Do you speak English?', 'I need help', 'Can you transfer me?'],
  ['Oi', 'Cancelar assinatura', 'Não quero mais', 'Tchau'],
  ['Preciso de ajuda urgente', 'Sistema não funciona', 'Isso é ridículo!', 'Quero meu dinheiro de volta'],
  ['Bom dia!', 'Gostaria de elogiar o atendimento', 'Vocês são ótimos', 'Obrigado!'],
]

function getConversationMessages(conversationIndex: number, turnIndex: number): string {
  const flow = CONVERSATION_FLOWS[conversationIndex % CONVERSATION_FLOWS.length]
  return flow[turnIndex % flow.length] || getRandomMessage()
}

// =============================================================================
// Request Sender
// =============================================================================

async function sendMessage(
  phone: string,
  message: string,
  turn: number,
  config: TestConfig
): Promise<RequestResult> {
  const payload = generateWebhookPayload({ phone, message })
  const requestStart = Date.now()

  try {
    const response = await fetch(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stress-Test': 'true',
        'X-Test-Turn': turn.toString(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.requestTimeout),
    })

    const latencyMs = Date.now() - requestStart

    let errorCode: string | undefined
    let errorMessage: string | undefined

    if (!response.ok) {
      try {
        const body = await response.json()
        errorCode = body.error?.code || body.code
        errorMessage = body.error?.message || body.message
      } catch {
        errorCode = `HTTP_${response.status}`
      }
    }

    return {
      phone,
      turn,
      success: response.ok,
      status: response.status,
      latencyMs,
      error: errorMessage,
      errorCode,
    }
  } catch (error) {
    const latencyMs = Date.now() - requestStart

    let errorCode = 'UNKNOWN'
    let errorMessage = 'Unknown error'

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        errorCode = 'TIMEOUT'
        errorMessage = `Request timeout after ${config.requestTimeout}ms`
      } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        errorCode = 'CONNECTION_REFUSED'
        errorMessage = 'Server not reachable'
      } else {
        errorCode = error.name
        errorMessage = error.message
      }
    }

    return {
      phone,
      turn,
      success: false,
      status: 0,
      latencyMs,
      error: errorMessage,
      errorCode,
    }
  }
}

// =============================================================================
// Virtual User (conversa simulada)
// =============================================================================

async function runConversation(
  userId: number,
  config: TestConfig,
  onProgress: (result: RequestResult) => void
): Promise<void> {
  const phone = generateUniquePhone(userId)

  for (let turn = 0; turn < config.turnsPerConversation; turn++) {
    const message = getConversationMessages(userId, turn)
    const result = await sendMessage(phone, message, turn, config)

    results.push(result)
    onProgress(result)

    // Simula tempo de "digitação" entre mensagens
    if (turn < config.turnsPerConversation - 1) {
      await new Promise(resolve => setTimeout(resolve, config.thinkTime))
    }
  }
}

// =============================================================================
// Metrics Aggregation
// =============================================================================

interface AggregatedMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  maxLatencyMs: number
  minLatencyMs: number
  errorsByCode: Record<string, number>
  requestsPerSecond: number
  totalDurationMs: number
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
  return sortedValues[Math.max(0, index)]
}

function aggregateMetrics(): AggregatedMetrics {
  const totalDurationMs = Date.now() - startTime
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b)
  const successfulRequests = results.filter(r => r.success).length
  const failedRequests = results.filter(r => !r.success).length

  const errorsByCode: Record<string, number> = {}
  for (const result of results) {
    if (!result.success && result.errorCode) {
      errorsByCode[result.errorCode] = (errorsByCode[result.errorCode] || 0) + 1
    }
  }

  return {
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    successRate: results.length > 0 ? (successfulRequests / results.length) * 100 : 0,
    avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    p50LatencyMs: calculatePercentile(latencies, 50),
    p95LatencyMs: calculatePercentile(latencies, 95),
    p99LatencyMs: calculatePercentile(latencies, 99),
    maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
    minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : 0,
    errorsByCode,
    requestsPerSecond: results.length / (totalDurationMs / 1000),
    totalDurationMs,
  }
}

// =============================================================================
// Report Generation
// =============================================================================

function generateReport(metrics: AggregatedMetrics, config: TestConfig): string {
  const lines: string[] = []

  lines.push('')
  lines.push('╔══════════════════════════════════════════════════════════════════╗')
  lines.push('║                  AI CHAT STRESS TEST REPORT                      ║')
  lines.push('╠══════════════════════════════════════════════════════════════════╣')
  lines.push(`║  Target: ${config.targetUrl.padEnd(53)}║`)
  lines.push(`║  VUs: ${config.vus.toString().padEnd(56)}║`)
  lines.push(`║  Turns/Conversation: ${config.turnsPerConversation.toString().padEnd(41)}║`)
  lines.push(`║  Total Requests: ${metrics.totalRequests.toString().padEnd(45)}║`)
  lines.push('╠══════════════════════════════════════════════════════════════════╣')
  lines.push('║                         RESULTS                                  ║')
  lines.push('╠══════════════════════════════════════════════════════════════════╣')

  // Success rate com cor
  const successEmoji = metrics.successRate >= 99 ? '🟢' : metrics.successRate >= 95 ? '🟡' : '🔴'
  lines.push(`║  ${successEmoji} Success Rate: ${metrics.successRate.toFixed(2)}%`.padEnd(65) + '║')
  lines.push(`║  ✅ Successful: ${metrics.successfulRequests}`.padEnd(65) + '║')
  lines.push(`║  ❌ Failed: ${metrics.failedRequests}`.padEnd(65) + '║')
  lines.push(`║  📊 Requests/sec: ${metrics.requestsPerSecond.toFixed(2)}`.padEnd(65) + '║')

  lines.push('╠══════════════════════════════════════════════════════════════════╣')
  lines.push('║                        LATENCY                                   ║')
  lines.push('╠══════════════════════════════════════════════════════════════════╣')
  lines.push(`║  Average: ${metrics.avgLatencyMs.toFixed(0)}ms`.padEnd(65) + '║')
  lines.push(`║  Min: ${metrics.minLatencyMs.toFixed(0)}ms`.padEnd(65) + '║')
  lines.push(`║  Max: ${metrics.maxLatencyMs.toFixed(0)}ms`.padEnd(65) + '║')
  lines.push(`║  P50: ${metrics.p50LatencyMs.toFixed(0)}ms`.padEnd(65) + '║')
  lines.push(`║  P95: ${metrics.p95LatencyMs.toFixed(0)}ms`.padEnd(65) + '║')
  lines.push(`║  P99: ${metrics.p99LatencyMs.toFixed(0)}ms`.padEnd(65) + '║')

  if (Object.keys(metrics.errorsByCode).length > 0) {
    lines.push('╠══════════════════════════════════════════════════════════════════╣')
    lines.push('║                        ERRORS                                    ║')
    lines.push('╠══════════════════════════════════════════════════════════════════╣')
    for (const [code, count] of Object.entries(metrics.errorsByCode)) {
      lines.push(`║  ${code}: ${count}`.padEnd(65) + '║')
    }
  }

  lines.push('╠══════════════════════════════════════════════════════════════════╣')
  lines.push(`║  Total Duration: ${(metrics.totalDurationMs / 1000).toFixed(1)}s`.padEnd(65) + '║')
  lines.push('╚══════════════════════════════════════════════════════════════════╝')

  return lines.join('\n')
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const config = parseArgs()

  // Help
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
AI Chat Stress Test

Uso:
  npx tsx tests/stress/ai-stress-test.ts [opções]

Opções:
  --target=URL       URL do webhook (default: http://localhost:3001/api/webhook)
  --vus=N            Número de conversas paralelas (default: 10)
  --turns=N          Mensagens por conversa (default: 4)
  --quick            Teste rápido (5 VUs, 2 turns)
  --aggressive       Teste agressivo (50 VUs, 5 turns)
  -h, --help         Mostra esta ajuda

Exemplos:
  # Teste padrão
  npx tsx tests/stress/ai-stress-test.ts

  # Teste rápido
  npx tsx tests/stress/ai-stress-test.ts --quick

  # Teste customizado
  npx tsx tests/stress/ai-stress-test.ts --vus=30 --turns=6
`)
    process.exit(0)
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    AI CHAT STRESS TEST                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Target: ${config.targetUrl.padEnd(53)}║
║  Virtual Users: ${config.vus.toString().padEnd(46)}║
║  Turns per conversation: ${config.turnsPerConversation.toString().padEnd(37)}║
║  Expected requests: ${(config.vus * config.turnsPerConversation).toString().padEnd(42)}║
╚══════════════════════════════════════════════════════════════════╝
`)

  startTime = Date.now()
  let completedRequests = 0
  let successCount = 0
  let failCount = 0

  const onProgress = (result: RequestResult) => {
    completedRequests++
    if (result.success) successCount++
    else failCount++

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const rps = (completedRequests / (Date.now() - startTime) * 1000).toFixed(1)

    // Progress line
    process.stdout.write(
      `\r⏳ ${elapsed}s | ${completedRequests}/${config.vus * config.turnsPerConversation} reqs | ${rps} req/s | ✅ ${successCount} ❌ ${failCount}   `
    )
  }

  console.log('🚀 Starting conversations...\n')

  // Lança todas as conversas em paralelo
  const conversations: Promise<void>[] = []
  for (let i = 0; i < config.vus; i++) {
    conversations.push(runConversation(i, config, onProgress))
  }

  // Aguarda todas finalizarem
  await Promise.all(conversations)

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(80) + '\r')

  // Gera métricas e relatório
  const metrics = aggregateMetrics()
  const report = generateReport(metrics, config)

  console.log(report)

  // Análise de problemas
  console.log('\n📋 ANÁLISE DE PROBLEMAS:')

  if (metrics.successRate < 100) {
    console.log(`\n⚠️  Taxa de sucesso: ${metrics.successRate.toFixed(2)}% (esperado: 100%)`)

    if (metrics.errorsByCode['TIMEOUT']) {
      console.log(`   🕐 ${metrics.errorsByCode['TIMEOUT']} timeouts detectados`)
      console.log('      → Possível gargalo no processamento de IA')
    }

    if (metrics.errorsByCode['CONNECTION_REFUSED']) {
      console.log(`   🔌 ${metrics.errorsByCode['CONNECTION_REFUSED']} conexões recusadas`)
      console.log('      → Servidor pode estar sobrecarregado')
    }

    for (const [code, count] of Object.entries(metrics.errorsByCode)) {
      if (code.startsWith('HTTP_')) {
        console.log(`   🌐 ${count}x ${code}`)
      }
    }
  } else {
    console.log('\n✅ Nenhum erro detectado!')
  }

  if (metrics.p95LatencyMs > 10000) {
    console.log(`\n⚠️  P95 latência alta: ${metrics.p95LatencyMs}ms`)
    console.log('   → Considere otimizar tempo de resposta da IA')
  }

  if (metrics.maxLatencyMs > 30000) {
    console.log(`\n⚠️  Latência máxima muito alta: ${metrics.maxLatencyMs}ms`)
    console.log('   → Algumas requisições estão demorando muito')
  }

  // Exit code baseado na taxa de sucesso
  if (metrics.successRate < 95) {
    console.log('\n❌ TESTE FALHOU: Taxa de sucesso abaixo de 95%')
    process.exit(1)
  }

  console.log('\n✅ TESTE PASSOU!')
}

main().catch(error => {
  console.error('Erro fatal:', error)
  process.exit(1)
})
