import { NextRequest, NextResponse } from 'next/server'
import { contactDb } from '@/lib/supabase-db'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import { ImportContactsSchema, validateBody, formatZodErrors } from '@/lib/api-validation'
import { ContactStatus } from '@/types'

/**
 * POST /api/contacts/import
 * Import multiple contacts from CSV/file
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSessionOrApiKey(request as NextRequest)
    if (auth) return auth

    const body = await request.json()

    // Validate input
    const validation = validateBody(ImportContactsSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: formatZodErrors(validation.error) },
        { status: 400 }
      )
    }

    const { contacts } = validation.data

    // Map to proper format with default status
    const contactsWithDefaults = contacts.map(c => ({
      name: c.name || '',
      phone: c.phone,
      email: c.email || null,
      status: ContactStatus.OPT_IN,
      tags: c.tags || [],
      custom_fields: c.custom_fields || {},
    }))

    const result = await contactDb.import(contactsWithDefaults)

    return NextResponse.json({
      inserted: result.inserted,
      updated: result.updated,
      total: contacts.length,
      // Manter compatibilidade com código legado
      imported: result.inserted + result.updated,
    })
  } catch (error) {
    console.error('Failed to import contacts:', error)
    return NextResponse.json(
      { error: 'Falha ao importar contatos' },
      { status: 500 }
    )
  }
}
