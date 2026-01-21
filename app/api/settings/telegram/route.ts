import { NextRequest, NextResponse } from 'next/server'
import { settingsDb } from '@/lib/supabase-db'
import { isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// =============================================================================
// Types
// =============================================================================

interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

interface TelegramConfig {
  botToken: string
  botUsername?: string
  botName?: string
  webhookUrl?: string
  miniAppUrl?: string
  isConfigured: boolean
}

// =============================================================================
// Helpers
// =============================================================================

async function callTelegramApi<T>(token: string, method: string, body?: object): Promise<T> {
  const url = `https://api.telegram.org/bot${token}/${method}`

  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.description || 'Telegram API error')
  }

  return data.result
}

function getBaseUrl(request: NextRequest): string {
  // Tentar pegar do header (funciona com ngrok/cloudflared)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  // Fallback para host normal
  const host = request.headers.get('host') || 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

// =============================================================================
// GET - Fetch current Telegram config
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        isConfigured: false,
        warning: 'Supabase não configurado',
      })
    }

    // Buscar configuração do banco
    const settings = await settingsDb.get('telegram_bot_token')
    const botToken = settings || ''

    if (!botToken) {
      return NextResponse.json({
        isConfigured: false,
      })
    }

    // Validar token e pegar info do bot
    try {
      const botInfo = await callTelegramApi<TelegramBotInfo>(botToken, 'getMe')

      // Pegar info do webhook atual
      const webhookInfo = await callTelegramApi<{ url: string }>(botToken, 'getWebhookInfo')

      return NextResponse.json({
        isConfigured: true,
        botUsername: botInfo.username,
        botName: botInfo.first_name,
        botId: botInfo.id,
        webhookUrl: webhookInfo.url || null,
        tokenPreview: `${botToken.slice(0, 10)}...${botToken.slice(-5)}`,
      })
    } catch (err) {
      // Token inválido ou expirado
      return NextResponse.json({
        isConfigured: false,
        error: 'Token inválido ou expirado',
        tokenPreview: `${botToken.slice(0, 10)}...`,
      })
    }
  } catch (error) {
    console.error('[telegram/settings] GET error:', error)
    return NextResponse.json({
      isConfigured: false,
      error: 'Erro ao buscar configuração',
    })
  }
}

// =============================================================================
// POST - Configure Telegram Bot (validate, set webhook, set menu button)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (!body?.botToken) {
      return NextResponse.json(
        { error: 'Token do bot é obrigatório' },
        { status: 400 }
      )
    }

    const { botToken } = body
    const baseUrl = getBaseUrl(request)

    // 1. Validar token
    let botInfo: TelegramBotInfo
    try {
      botInfo = await callTelegramApi<TelegramBotInfo>(botToken, 'getMe')
    } catch (err) {
      return NextResponse.json(
        { error: 'Token inválido. Verifique se copiou corretamente do @BotFather.' },
        { status: 401 }
      )
    }

    // 2. Configurar Webhook
    const webhookUrl = `${baseUrl}/api/telegram/webhook`
    try {
      await callTelegramApi(botToken, 'setWebhook', {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'my_chat_member'],
        drop_pending_updates: true,
      })
    } catch (err: any) {
      console.error('[telegram/settings] Webhook error:', err)
      return NextResponse.json(
        { error: `Erro ao configurar webhook: ${err.message}` },
        { status: 500 }
      )
    }

    // 3. Configurar Menu Button (Mini App)
    const miniAppUrl = `${baseUrl}/tg`
    try {
      await callTelegramApi(botToken, 'setChatMenuButton', {
        menu_button: {
          type: 'web_app',
          text: '📱 Monitor',
          web_app: { url: miniAppUrl },
        },
      })
    } catch (err: any) {
      console.error('[telegram/settings] Menu button error:', err)
      // Não falhar por isso, apenas avisar
    }

    // 4. Salvar no banco
    await settingsDb.set('telegram_bot_token', botToken)
    await settingsDb.set('telegram_bot_username', botInfo.username)
    await settingsDb.set('telegram_webhook_url', webhookUrl)
    await settingsDb.set('telegram_miniapp_url', miniAppUrl)

    return NextResponse.json({
      success: true,
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      botId: botInfo.id,
      webhookUrl,
      miniAppUrl,
      message: 'Bot configurado com sucesso!',
    })
  } catch (error) {
    console.error('[telegram/settings] POST error:', error)
    return NextResponse.json(
      { error: 'Erro ao configurar bot' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Remove Telegram config
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Buscar token antes de apagar para remover webhook
    const botToken = await settingsDb.get('telegram_bot_token')

    if (botToken) {
      try {
        // Remover webhook
        await callTelegramApi(botToken, 'deleteWebhook', {
          drop_pending_updates: true,
        })

        // Resetar menu button para default
        await callTelegramApi(botToken, 'setChatMenuButton', {
          menu_button: { type: 'default' },
        })
      } catch (err) {
        // Ignorar erros ao limpar (token pode já estar inválido)
        console.warn('[telegram/settings] Cleanup warning:', err)
      }
    }

    // Limpar do banco
    await settingsDb.set('telegram_bot_token', '')
    await settingsDb.set('telegram_bot_username', '')
    await settingsDb.set('telegram_webhook_url', '')
    await settingsDb.set('telegram_miniapp_url', '')

    return NextResponse.json({
      success: true,
      message: 'Configuração do Telegram removida.',
    })
  } catch (error) {
    console.error('[telegram/settings] DELETE error:', error)
    return NextResponse.json(
      { error: 'Erro ao remover configuração' },
      { status: 500 }
    )
  }
}
