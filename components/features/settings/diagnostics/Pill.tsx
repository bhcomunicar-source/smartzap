'use client'

import type { ReactNode } from 'react'

export interface PillProps {
  tone: 'ok' | 'warn' | 'fail' | 'neutral'
  children: ReactNode
}

export function Pill({ tone, children }: PillProps) {
  const base = 'inline-flex items-center px-2 py-1 rounded-lg text-xs font-mono border'

  if (tone === 'ok') {
    return (
      <span className={`${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-200`}>
        {children}
      </span>
    )
  }

  if (tone === 'warn') {
    return (
      <span className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-200`}>
        {children}
      </span>
    )
  }

  if (tone === 'fail') {
    return (
      <span className={`${base} bg-red-500/10 border-red-500/20 text-red-200`}>
        {children}
      </span>
    )
  }

  return (
    <span className={`${base} bg-white/5 border-white/10 text-gray-200`}>
      {children}
    </span>
  )
}
