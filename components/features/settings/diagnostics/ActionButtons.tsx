'use client'

import Link from 'next/link'
import { ExternalLink, Wand2 } from 'lucide-react'
import type { MetaDiagnosticsAction } from '@/services/metaDiagnosticsService'

export interface ActionButtonsProps {
  actions: MetaDiagnosticsAction[]
  onRunAction: (a: MetaDiagnosticsAction) => void
  disabled?: boolean
  disabledReason?: string
}

export function ActionButtons(props: ActionButtonsProps) {
  const { actions } = props
  if (!actions?.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((a) => {
        if (a.kind === 'link' && a.href) {
          return (
            <Link
              key={a.id}
              href={a.href}
              className="px-3 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium inline-flex items-center gap-2"
            >
              <ExternalLink size={14} />
              {a.label}
            </Link>
          )
        }

        if (a.kind === 'api') {
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => props.onRunAction(a)}
              disabled={props.disabled}
              className="px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-400 text-black font-medium transition-colors text-sm inline-flex items-center gap-2 disabled:opacity-50"
              title={
                props.disabled
                  ? props.disabledReason || 'Acao temporariamente indisponivel'
                  : a.endpoint
                    ? `${a.method || 'POST'} ${a.endpoint}`
                    : undefined
              }
            >
              <Wand2 size={14} />
              {a.label}
            </button>
          )
        }

        return null
      })}
    </div>
  )
}
