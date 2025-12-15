'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ListPlus,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
  Wand2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import {
  FlowFormFieldType,
  FlowFormOption,
  FlowFormSpecV1,
  generateFlowJsonFromFormSpec,
  normalizeFlowFieldName,
  normalizeFlowFormSpec,
  validateFlowFormSpec,
} from '@/lib/flow-form'

import { FlowPhonePreview } from '@/components/ui/FlowPhonePreview'

const FIELD_TYPE_LABEL: Record<FlowFormFieldType, string> = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  email: 'E-mail',
  phone: 'Telefone',
  number: 'Número',
  date: 'Data',
  dropdown: 'Lista (dropdown)',
  single_choice: 'Escolha única',
  multi_choice: 'Múltipla escolha',
  optin: 'Opt-in (checkbox)',
}

function newField(type: FlowFormFieldType): any {
  const id = `q_${nanoid(8)}`
  const baseLabel = type === 'optin' ? 'Quero receber novidades' : 'Nova pergunta'
  const name = normalizeFlowFieldName(baseLabel) || `campo_${nanoid(4)}`

  const f: any = {
    id,
    type,
    label: baseLabel,
    name,
    required: type === 'optin' ? false : true,
  }

  if (type === 'optin') {
    f.text = 'Quero receber mensagens sobre novidades e promoções.'
  }

  if (type === 'dropdown' || type === 'single_choice' || type === 'multi_choice') {
    f.options = [
      { id: 'opcao_1', title: 'Opção 1' },
      { id: 'opcao_2', title: 'Opção 2' },
    ]
    f.required = false
  }

  if (type === 'date') {
    f.required = true
  }

  return f
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function FlowFormBuilder(props: {
  flowName: string
  currentSpec: unknown
  isSaving: boolean
  onSave: (patch: { spec: unknown; flowJson: unknown }) => void
}) {
  const initialForm = useMemo(() => {
    const s = (props.currentSpec as any) || {}
    return normalizeFlowFormSpec(s?.form, props.flowName)
  }, [props.currentSpec, props.flowName])

  const [form, setForm] = useState<FlowFormSpecV1>(initialForm)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (dirty) return
    setForm(initialForm)
  }, [dirty, initialForm])

  const issues = useMemo(() => validateFlowFormSpec(form), [form])
  const generatedJson = useMemo(() => generateFlowJsonFromFormSpec(form), [form])

  const canSave = issues.length === 0 && dirty && !props.isSaving

  const update = (patch: Partial<FlowFormSpecV1>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }

  const updateField = (idx: number, patch: any) => {
    setForm((prev) => {
      const fields = [...prev.fields]
      fields[idx] = { ...fields[idx], ...patch }
      return { ...prev, fields }
    })
    setDirty(true)
  }

  const addField = (type: FlowFormFieldType) => {
    setForm((prev) => ({ ...prev, fields: [...prev.fields, newField(type)] }))
    setDirty(true)
  }

  const duplicateField = (idx: number) => {
    setForm((prev) => {
      const f = prev.fields[idx]
      const copy = {
        ...f,
        id: `q_${nanoid(8)}`,
        name: normalizeFlowFieldName(`${f.name}_copy`) || `campo_${nanoid(4)}`,
      }
      const fields = [...prev.fields]
      fields.splice(idx + 1, 0, copy)
      return { ...prev, fields }
    })
    setDirty(true)
  }

  const removeField = (idx: number) => {
    setForm((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }))
    setDirty(true)
  }

  const save = () => {
    const baseSpec = (props.currentSpec && typeof props.currentSpec === 'object') ? (props.currentSpec as any) : {}
    const nextSpec = { ...baseSpec, form }

    props.onSave({
      spec: nextSpec,
      flowJson: generatedJson,
    })
    setDirty(false)
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Criador de Formulário (estilo Google Forms)
            </div>
            <div className="text-sm text-gray-400">
              Você edita as perguntas, e o SmartZap gera o <span className="font-semibold">Flow JSON</span> automaticamente.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={props.isSaving}
              onClick={save}
            >
              <Save className="h-4 w-4" />
              Salvar formulário
            </Button>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">Ajustes necessários</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-amber-200/80">
                {issues.slice(0, 6).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <Input value={form.title} onChange={(e) => update({ title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Screen ID (Meta)</label>
                <Input value={form.screenId} onChange={(e) => update({ screenId: e.target.value.toUpperCase() })} />
                <div className="text-[11px] text-gray-500 mt-1">Ex: CADASTRO, NPS, AGENDAMENTO</div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Texto de introdução</label>
              <Textarea value={form.intro || ''} onChange={(e) => update({ intro: e.target.value })} className="min-h-20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Texto do botão</label>
                <Input value={form.submitLabel} onChange={(e) => update({ submitLabel: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Adicionar pergunta</label>
                <Select
                  onValueChange={(v) => addField(v as FlowFormFieldType)}
                >
                  <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                    <SelectValue placeholder="Escolha o tipo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <div className="text-xs uppercase tracking-widest font-bold text-gray-400 flex items-center justify-center">
                  Prévia do Flow
                </div>
                <div className="mt-3">
                  <FlowPhonePreview
                    flowJson={generatedJson}
                    businessName="SmartZap Business"
                    size="md"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-950/20 p-4">
              <div className="text-sm font-semibold text-white">Status</div>
              <div className="mt-2 text-sm text-gray-400">
                {dirty ? 'Alterações não salvas' : 'Sincronizado'}
                {issues.length === 0 ? (
                  <span className="text-emerald-300"> • pronto</span>
                ) : (
                  <span className="text-amber-300"> • revisar</span>
                )}
              </div>

              <div className="mt-3 text-[11px] text-gray-500">
                Este modo cria o JSON no padrão usado pelos templates internos (sem endpoint).
              </div>

              <Button
                type="button"
                className="mt-3 w-full"
                disabled={!canSave}
                onClick={save}
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm font-semibold text-white flex items-center gap-2">
            <ListPlus className="h-4 w-4" />
            Perguntas
          </div>
          <Button type="button" variant="secondary" onClick={() => addField('short_text')}>
            <Plus className="h-4 w-4" />
            Texto curto
          </Button>
        </div>

        {form.fields.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-500">
            Nenhuma pergunta ainda. Clique em “Adicionar pergunta”.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {form.fields.map((f, idx) => {
              const showOptions = f.type === 'dropdown' || f.type === 'single_choice' || f.type === 'multi_choice'
              return (
                <div key={f.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Pergunta</label>
                          <Input
                            value={f.label}
                            onChange={(e) => {
                              const nextLabel = e.target.value
                              const suggested = normalizeFlowFieldName(nextLabel)
                              updateField(idx, {
                                label: nextLabel,
                                // Só auto-ajusta se o usuário ainda não editou muito o name
                                name: f.name ? f.name : suggested,
                              })
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                          <Select
                            value={f.type}
                            onValueChange={(v) => {
                              const nextType = v as FlowFormFieldType
                              const base: any = { type: nextType }
                              if (nextType === 'optin') {
                                base.required = false
                                base.text = f.text || 'Quero receber mensagens.'
                                delete base.options
                              }
                              if (nextType === 'dropdown' || nextType === 'single_choice' || nextType === 'multi_choice') {
                                base.required = false
                                base.options = (f.options && f.options.length > 0) ? f.options : [
                                  { id: 'opcao_1', title: 'Opção 1' },
                                  { id: 'opcao_2', title: 'Opção 2' },
                                ]
                              }
                              if (nextType === 'date') {
                                base.required = true
                                delete base.options
                              }
                              updateField(idx, base)
                            }}
                          >
                            <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(FIELD_TYPE_LABEL).map(([k, label]) => (
                                <SelectItem key={k} value={k}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Identificador (name)</label>
                          <Input
                            value={f.name}
                            onChange={(e) => updateField(idx, { name: normalizeFlowFieldName(e.target.value) })}
                          />
                          <div className="text-[11px] text-gray-500 mt-1">Isso vira a chave no response_json.</div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900/40 px-3 py-2">
                          <div>
                            <div className="text-xs font-medium text-gray-300">Obrigatório</div>
                            <div className="text-[11px] text-gray-500">O usuário precisa preencher</div>
                          </div>
                          <Switch
                            checked={!!f.required}
                            onCheckedChange={(checked) => updateField(idx, { required: checked })}
                            disabled={f.type === 'optin'}
                          />
                        </div>
                      </div>

                      {f.type === 'optin' ? (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-400 mb-1">Texto do opt-in</label>
                          <Textarea
                            value={f.text || ''}
                            onChange={(e) => updateField(idx, { text: e.target.value })}
                            className="min-h-18"
                          />
                        </div>
                      ) : null}

                      {showOptions ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between gap-2">
                            <label className="block text-xs text-gray-400">Opções</label>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                const next = [...(f.options || [])]
                                const n = next.length + 1
                                next.push({ id: `opcao_${n}`, title: `Opção ${n}` })
                                updateField(idx, { options: next })
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Adicionar opção
                            </Button>
                          </div>

                          <div className="mt-2 space-y-2">
                            {(f.options || []).map((opt: FlowFormOption, oidx: number) => (
                              <div key={`${f.id}_${oidx}`} className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-center">
                                <Input
                                  value={opt.id}
                                  onChange={(e) => {
                                    const next = [...(f.options || [])]
                                    next[oidx] = { ...next[oidx], id: normalizeFlowFieldName(e.target.value) || next[oidx].id }
                                    updateField(idx, { options: next })
                                  }}
                                  className="font-mono text-xs"
                                  placeholder="id"
                                />
                                <Input
                                  value={opt.title}
                                  onChange={(e) => {
                                    const next = [...(f.options || [])]
                                    next[oidx] = { ...next[oidx], title: e.target.value }
                                    updateField(idx, { options: next })
                                  }}
                                  placeholder="Título"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-white/10 bg-zinc-900 hover:bg-white/5"
                                  onClick={() => {
                                    const next = (f.options || []).filter((_, i) => i !== oidx)
                                    updateField(idx, { options: next })
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 bg-zinc-900 hover:bg-white/5"
                        disabled={idx === 0}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, fields: moveItem(prev.fields, idx, Math.max(0, idx - 1)) }))
                          setDirty(true)
                        }}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 bg-zinc-900 hover:bg-white/5"
                        disabled={idx === form.fields.length - 1}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, fields: moveItem(prev.fields, idx, Math.min(prev.fields.length - 1, idx + 1)) }))
                          setDirty(true)
                        }}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 bg-zinc-900 hover:bg-white/5"
                        onClick={() => duplicateField(idx)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-500/20 bg-zinc-900 hover:bg-red-500/10"
                        onClick={() => removeField(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <details className="glass-panel p-4">
        <summary className="cursor-pointer text-sm text-gray-300">Ver JSON gerado (avançado)</summary>
        <pre className="mt-3 text-xs text-gray-300 font-mono whitespace-pre-wrap wrap-break-word">
          {JSON.stringify(generatedJson, null, 2)}
        </pre>
      </details>
    </div>
  )
}
