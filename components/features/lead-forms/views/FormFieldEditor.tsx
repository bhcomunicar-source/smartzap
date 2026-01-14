'use client'

import type { LeadFormField } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ArrowDown, ArrowUp } from 'lucide-react'

export interface FormFieldEditorProps {
  field: LeadFormField
  index: number
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
  onUpdate: (index: number, patch: Partial<LeadFormField>) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export function FormFieldEditor({
  field,
  index,
  isFirst,
  isLast,
  disabled = false,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FormFieldEditorProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-zinc-500">Ordem do campo</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8 border-zinc-700 bg-zinc-900 px-2"
            onClick={() => onMoveUp(index)}
            disabled={disabled || isFirst}
            title="Mover para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 border-zinc-700 bg-zinc-900 px-2"
            onClick={() => onMoveDown(index)}
            disabled={disabled || isLast}
            title="Mover para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Label</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate(index, { label: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
            placeholder="Ex: Qual sua turma?"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label>Key (salvo em custom_fields)</Label>
          <Input
            value={field.key}
            onChange={(e) => onUpdate(index, { key: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
            placeholder="Ex: turma"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <Label>Tipo</Label>
          <select
            className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm"
            value={field.type}
            onChange={(e) => onUpdate(index, { type: e.target.value as LeadFormField['type'] })}
            disabled={disabled}
          >
            <option value="text">Texto</option>
            <option value="number">Numero</option>
            <option value="date">Data</option>
            <option value="select">Lista (select)</option>
          </select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3">
          <div>
            <p className="text-sm">Obrigatorio</p>
            <p className="text-xs text-zinc-500">Exige preenchimento</p>
          </div>
          <Switch
            checked={!!field.required}
            onCheckedChange={(checked) => onUpdate(index, { required: checked })}
            disabled={disabled}
          />
        </div>
      </div>

      {field.type === 'select' ? (
        <div className="mt-3 space-y-1">
          <Label>Opcoes (uma por linha)</Label>
          <Textarea
            value={(field.options || []).join('\n')}
            onChange={(e) =>
              onUpdate(index, {
                options: e.target.value
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
            className="min-h-22.5 bg-zinc-900 border-zinc-800"
            placeholder="Ex:\nTurma A\nTurma B\nTurma C"
            disabled={disabled}
          />
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <Button type="button" variant="destructive" onClick={() => onRemove(index)} disabled={disabled}>
          Remover campo
        </Button>
      </div>
    </div>
  )
}
