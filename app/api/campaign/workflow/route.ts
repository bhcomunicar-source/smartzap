import { serve } from '@upstash/workflow/nextjs'
import { campaignDb, templateDb } from '@/lib/supabase-db'
import { supabase } from '@/lib/supabase'
import { CampaignStatus } from '@/types'
import { getUserFriendlyMessage } from '@/lib/whatsapp-errors'
import { buildMetaTemplatePayload, precheckContactForTemplate } from '@/lib/whatsapp/template-contract'

interface Contact {
  contactId: string
  phone: string
  name: string
  custom_fields?: Record<string, unknown>
  email?: string
}

interface CampaignWorkflowInput {
  campaignId: string
  templateName: string
  contacts: Contact[]
  templateVariables?: { header: string[], body: string[], buttons?: Record<string, string> }  // Meta API structure
  templateSnapshot?: {
    name: string
    language?: string
    parameter_format?: 'positional' | 'named'
    spec_hash?: string | null
    fetched_at?: string | null
    components?: any
  }
  phoneNumberId: string
  accessToken: string
  isResend?: boolean
}

async function claimPendingForSend(
  campaignId: string,
  identifiers: { contactId: string; phone: string }
): Promise<boolean> {
  const now = new Date().toISOString()
  const query = supabase
    .from('campaign_contacts')
    .update({ status: 'sending', sending_at: now })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .eq('contact_id', identifiers.contactId)
    .select('id')

  const { data, error } = await query

  if (error) {
    console.warn(
      `[Workflow] Falha ao claimar contato ${identifiers.phone} (seguindo sem enviar):`,
      error
    )
    return false
  }
  return Array.isArray(data) && data.length > 0
}

/**
 * Build template body parameters
 * {{1}} = contact name (dynamic per contact)
 * {{2}}, {{3}}, ... = static values from templateVariables
 */
function buildBodyParameters(contactName: string, templateVariables: string[] = []): Array<{ type: string; text: string }> {
  // First parameter is always the contact name
  const parameters = [{ type: 'text', text: contactName || 'Cliente' }]

  // Add static variables for {{2}}, {{3}}, etc.
  for (const value of templateVariables) {
    parameters.push({ type: 'text', text: value || '' })
  }

  return parameters
}

// Atualiza status do contato no banco (Supabase)
async function updateContactStatus(
  campaignId: string,
  identifiers: { contactId: string; phone: string },
  status: 'sent' | 'failed' | 'skipped',
  opts?: { messageId?: string; error?: string; skipCode?: string; skipReason?: string }
) {
  try {
    const now = new Date().toISOString()
    const update: any = {
      status,
    }

    if (status === 'sent') {
      update.sent_at = now
      update.message_id = opts?.messageId || null
      update.error = null
      update.skip_code = null
      update.skip_reason = null
      update.skipped_at = null
    }

    if (status === 'failed') {
      update.failed_at = now
      update.error = opts?.error || null
    }

    if (status === 'skipped') {
      update.skipped_at = now
      update.skip_code = opts?.skipCode || null
      update.skip_reason = opts?.skipReason || opts?.error || null
      update.error = null
      update.message_id = null
    }

    const query = supabase
      .from('campaign_contacts')
      .update(update)
      .eq('campaign_id', campaignId)
      .eq('contact_id', identifiers.contactId)

    await query
  } catch (e) {
    console.error(`Failed to update contact status: ${identifiers.phone}`, e)
  }
}

// Upstash Workflow - Durable background processing
// Each step is a separate HTTP request, bypasses Vercel 10s timeout
export const { POST } = serve<CampaignWorkflowInput>(
  async (context) => {
    const { campaignId, templateName, contacts, templateVariables, phoneNumberId, accessToken, templateSnapshot } = context.requestPayload

    // HARDENING: workflow é estritamente baseado em contact_id.
    // Se vier algum contato sem contactId, é bug no dispatch/resend e devemos falhar cedo.
    const missingContactIds = (contacts || []).filter((c) => !c.contactId || String(c.contactId).trim().length === 0)
    if (missingContactIds.length > 0) {
      const sample = missingContactIds.slice(0, 10).map((c) => ({ phone: c.phone, name: c.name || '' }))
      throw new Error(
        `[Workflow] Payload inválido: ${missingContactIds.length} contato(s) sem contactId. Exemplo: ${JSON.stringify(sample)}`
      )
    }

    // Step 1: Mark campaign as SENDING in Supabase
    await context.run('init-campaign', async () => {
      const nowIso = new Date().toISOString()
      const existing = await campaignDb.getById(campaignId)
      const startedAt = (existing as any)?.startedAt || nowIso

      await campaignDb.updateStatus(campaignId, {
        status: CampaignStatus.SENDING,
        startedAt,
        completedAt: null,
      })

      console.log(`📊 Campaign ${campaignId} started with ${contacts.length} contacts`)
      console.log(`📝 Template variables: ${JSON.stringify(templateVariables || [])}`)
    })

    // Step 2: Process contacts in batches of 40
    // Each batch is a separate step = separate HTTP request = bypasses 10s limit
    const BATCH_SIZE = 40
    const batches: Contact[][] = []

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      batches.push(contacts.slice(i, i + BATCH_SIZE))
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]

      await context.run(`send-batch-${batchIndex}`, async () => {
        let sentCount = 0
        let failedCount = 0
        let skippedCount = 0

        const template: any = templateSnapshot || (await templateDb.getByName(templateName))
        if (!template) throw new Error(`Template ${templateName} não encontrado no banco local. Sincronize Templates.`)

        for (const contact of batch) {
          try {
            // Check if campaign is paused (via Supabase)
            const { data: campaignStatus } = await supabase
              .from('campaigns')
              .select('status')
              .eq('id', campaignId)
              .single()

            if (campaignStatus?.status === CampaignStatus.PAUSED) {
              console.log(`⏸️ Campaign ${campaignId} is paused, skipping remaining`)
              break
            }

            // Idempotência (at-least-once): se já foi processado, não reenviar
            const existingQuery = supabase
              .from('campaign_contacts')
              .select('status, message_id')
              .eq('campaign_id', campaignId)
              .eq('contact_id', contact.contactId as string)

            const { data: existingRow } = await existingQuery.single()

            const existingStatus = (existingRow as any)?.status as string | undefined
            if (existingStatus && ['sent', 'delivered', 'read', 'failed', 'skipped'].includes(existingStatus)) {
              console.log(`↩️ Idempotência: ${contact.phone} já está em status=${existingStatus}, pulando.`)
              continue
            }
            if (existingStatus === 'sending') {
              console.log(`↩️ Idempotência: ${contact.phone} já está em status=sending (em progresso), pulando.`)
              continue
            }

            // Contrato Ouro: pré-check/guard-rail por contato (documented-only)
            const precheck = precheckContactForTemplate(
              {
                phone: contact.phone,
                name: contact.name,
                email: contact.email,
                custom_fields: contact.custom_fields,
                contactId: contact.contactId || null,
              },
              template as any,
              templateVariables as any
            )

            if (!precheck.ok) {
              await updateContactStatus(campaignId, { contactId: contact.contactId as string, phone: contact.phone }, 'skipped', {
                skipCode: precheck.skipCode,
                skipReason: precheck.reason,
              })
              skippedCount++
              console.log(`⏭️ Skipped ${contact.phone}: ${precheck.reason}`)
              continue
            }

            // Claim idempotente: só 1 executor envia por contato
            const claimed = await claimPendingForSend(campaignId, { contactId: contact.contactId as string, phone: contact.phone })
            if (!claimed) {
              console.log(`↩️ Idempotência: ${contact.phone} não estava pending (ou já claimado), pulando envio.`)
              continue
            }

            const whatsappPayload: any = buildMetaTemplatePayload({
              to: precheck.normalizedPhone,
              templateName,
              language: (template as any).language || 'pt_BR',
              parameterFormat: (template as any).parameter_format || (template as any).parameterFormat || 'positional',
              values: precheck.values,
            })

            console.log('--- META API PAYLOAD (CONTRACT) ---', JSON.stringify(whatsappPayload, null, 2))

            const response = await fetch(
              `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(whatsappPayload),
              }
            )

            const data = await response.json()

            if (response.ok && data.messages?.[0]?.id) {
              const messageId = data.messages[0].id

              // Update contact status in Supabase (stores message_id for webhook lookup)
              await updateContactStatus(campaignId, { contactId: contact.contactId as string, phone: contact.phone }, 'sent', { messageId })

              sentCount++
              console.log(`✅ Sent to ${contact.phone}`)
            } else {
              // Extract error code and translate to Portuguese
              const errorCode = data.error?.code || 0
              const originalError = data.error?.message || 'Unknown error'
              const translatedError = getUserFriendlyMessage(errorCode) || originalError
              const errorWithCode = `(#${errorCode}) ${translatedError}`

              // Update contact status in Supabase
              await updateContactStatus(campaignId, { contactId: contact.contactId as string, phone: contact.phone }, 'failed', { error: errorWithCode })

              failedCount++
              console.log(`❌ Failed ${contact.phone}: ${errorWithCode}`)
            }

            // Small delay between messages (15ms ~ 66 msgs/sec)
            await new Promise(resolve => setTimeout(resolve, 15))

          } catch (error) {
            // Update contact status in Supabase
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
            // Neste ponto, contactId é obrigatório (validado no início)
            await updateContactStatus(campaignId, { contactId: contact.contactId as string, phone: contact.phone }, 'failed', { error: errorMsg })
            failedCount++
            console.error(`❌ Error sending to ${contact.phone}:`, error)
          }
        }

        // Update stats in Supabase (source of truth)
        // Supabase Realtime will propagate changes to frontend
        const campaign = await campaignDb.getById(campaignId)
        if (campaign) {
          await campaignDb.updateStatus(campaignId, {
            sent: campaign.sent + sentCount,
            failed: campaign.failed + failedCount,
            skipped: (campaign as any).skipped + skippedCount
          })
        }

        console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`)
      })
    }

    // Step 3: Mark campaign as completed
    await context.run('complete-campaign', async () => {
      const campaign = await campaignDb.getById(campaignId)

      let finalStatus = CampaignStatus.COMPLETED
      if (campaign && (campaign.failed + (campaign as any).skipped) === campaign.recipients && campaign.recipients > 0) {
        finalStatus = CampaignStatus.FAILED
      }

      await campaignDb.updateStatus(campaignId, {
        status: finalStatus,
        completedAt: new Date().toISOString()
      })

      console.log(`🎉 Campaign ${campaignId} completed!`)
    })
  },
  {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL?.trim()
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}` : undefined)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : undefined),
    retries: 3,
  }
)
