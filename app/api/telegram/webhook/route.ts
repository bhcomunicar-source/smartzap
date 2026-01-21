import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// =============================================================================
// Telegram Webhook Handler
// =============================================================================

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    chat: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      type: 'private' | 'group' | 'supergroup' | 'channel'
    }
    date: number
    text?: string
  }
  callback_query?: {
    id: string
    from: {
      id: number
      first_name: string
      username?: string
    }
    data?: string
  }
  my_chat_member?: {
    chat: { id: number }
    from: { id: number }
    new_chat_member: {
      status: 'member' | 'kicked' | 'left' | 'administrator' | 'creator'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()

    console.log('[telegram/webhook] Received update:', JSON.stringify(update, null, 2))

    // Handler para mensagens de texto
    if (update.message?.text) {
      const { message } = update
      const chatId = message.chat.id
      const text = message.text
      const userId = message.from.id
      const userName = message.from.first_name

      console.log(`[telegram/webhook] Message from ${userName} (${userId}): ${text}`)

      // Por enquanto, apenas logamos.
      // TODO: Integrar com o sistema de conversas do SmartZap
    }

    // Handler para callback queries (botões inline)
    if (update.callback_query) {
      const { callback_query } = update
      console.log(`[telegram/webhook] Callback query: ${callback_query.data}`)

      // TODO: Processar ações de botões
    }

    // Handler para mudanças de status do bot no chat
    if (update.my_chat_member) {
      const { my_chat_member } = update
      const status = my_chat_member.new_chat_member.status

      console.log(`[telegram/webhook] Bot status changed to: ${status}`)

      // TODO: Registrar quando usuário bloqueia/desbloqueia o bot
    }

    // Telegram espera 200 OK
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[telegram/webhook] Error:', error)
    // Retornar 200 mesmo com erro para evitar retries do Telegram
    return NextResponse.json({ ok: true })
  }
}

// GET para verificação de saúde
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-webhook',
    timestamp: new Date().toISOString(),
  })
}
