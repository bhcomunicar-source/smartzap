'use client'

import type { LeadFormField } from '@/types'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InternationalPhoneInput } from '@/components/ui/international-phone-input'

export interface LeadFormPreviewProps {
  title: string
  collectEmail: boolean
  fields: LeadFormField[]
}

export function LeadFormPreview({ title, collectEmail, fields }: LeadFormPreviewProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-white">Pre-visualizacao</p>
        <p className="text-xs text-zinc-500">Assim vai aparecer para a pessoa que abrir o link publico.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-4">
          <p className="text-lg font-semibold text-white">{title || 'Formulario'}</p>
          <p className="text-xs text-zinc-400">Preencha seus dados para ser adicionado automaticamente na lista.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input className="bg-zinc-800 border-zinc-700" placeholder="Seu nome" disabled value="" readOnly />
          </div>

          <div className="space-y-2">
            <Label>Telefone (WhatsApp)</Label>
            <InternationalPhoneInput
              value=""
              onChange={() => {}}
              defaultCountry="br"
              preferredCountries={['br', 'us', 'pt', 'mx', 'ar', 'cl', 'co', 'es']}
              disabled
            />
          </div>

          {collectEmail ? (
            <div className="space-y-2">
              <Label>Email (opcional)</Label>
              <Input className="bg-zinc-800 border-zinc-700" placeholder="voce@exemplo.com" disabled value="" readOnly />
            </div>
          ) : null}

          {fields.length > 0 ? (
            <div className="space-y-4">
              {fields.map((f, idx) => {
                const key = f.key || `campo_${idx}`

                if (f.type === 'select') {
                  return (
                    <div key={`${key}-${idx}`} className="space-y-2">
                      <Label>
                        {f.label}
                        {f.required ? ' *' : ''}
                      </Label>
                      <select
                        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm"
                        disabled
                        value=""
                      >
                        <option value="">Selecionar...</option>
                        {(f.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                }

                const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'
                return (
                  <div key={`${key}-${idx}`} className="space-y-2">
                    <Label>
                      {f.label}
                      {f.required ? ' *' : ''}
                    </Label>
                    <Input className="bg-zinc-800 border-zinc-700" disabled value="" readOnly type={inputType} />
                  </div>
                )
              })}
            </div>
          ) : null}

          <Button type="button" className="w-full" disabled>
            Enviar (preview)
          </Button>
        </div>
      </div>
    </div>
  )
}
