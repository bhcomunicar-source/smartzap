import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type NgrokStatus = {
  running: boolean
  port: number
  publicUrl: string | null
  tunnelName?: string | null
  hasApi: boolean
  apiError?: string | null
  binaries?: {
    ngrok?: boolean
    cloudflared?: boolean
    ngrokError?: string | null
    cloudflaredError?: string | null
  }
}

export function NgrokDevPanel() {
  const [status, setStatus] = React.useState<NgrokStatus | null>(null)
  const [port, setPort] = React.useState('3000')
  const [loading, setLoading] = React.useState(false)
  const autoStartedRef = React.useRef(false)

  const refresh = React.useCallback(async (opts?: { autostart?: boolean }) => {
    setLoading(true)
    try {
      const url = opts?.autostart ? '/api/debug/ngrok?autostart=1' : '/api/debug/ngrok'
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) return
      const data = (await res.json()) as NgrokStatus
      // #region agent log
      try {
        fetch('http://127.0.0.1:7243/ingest/1294d6ce-76f2-430d-96ab-3ae4d7527327',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'ngrok-dev',hypothesisId:'N1',location:'components/features/settings/NgrokDevPanel.tsx:refresh',message:'ngrok status response',data:{running:!!data.running,publicUrl:data.publicUrl||null,hasApi:!!data.hasApi,port:data.port},timestamp:Date.now()})}).catch(()=>{})
      } catch {}
      // #endregion agent log
      setStatus(data)
      setPort(String(data.port || '3000'))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!autoStartedRef.current) {
      autoStartedRef.current = true
      refresh({ autostart: true })
      return
    }
    refresh()
  }, [refresh])

  const start = React.useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/debug/ngrok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: Number(port) || 3000 }),
      })
    } finally {
      await refresh()
    }
  }, [port, refresh])

  const stop = React.useCallback(async () => {
    setLoading(true)
    try {
      await fetch('/api/debug/ngrok', { method: 'DELETE' })
    } finally {
      await refresh()
    }
  }, [refresh])

  const webhookUrl = status?.publicUrl ? `${status.publicUrl}/api/webhook` : ''
  const showApiError = status && !status.hasApi
  const hasNgrok = status?.binaries?.ngrok ?? false
  const hasCloudflared = status?.binaries?.cloudflared ?? false
  const showRunning = !!status?.running || !!status?.publicUrl
  const canCopy = !!webhookUrl
  const canStart = hasNgrok || status?.hasApi

  const copyUrl = React.useCallback(async () => {
    if (!webhookUrl) return
    try {
      await navigator.clipboard.writeText(webhookUrl)
    } catch {
      // ignore
    }
  }, [webhookUrl])

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-white">Webhook local (dev)</div>
        <div className="text-xs text-gray-500 mt-1">
          Inicia o ngrok localmente para monitorar o webhook no ambiente de desenvolvimento.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">Porta</span>
          <Input value={port} onChange={(e) => setPort(e.target.value)} className="h-8 w-20" />
        </div>
        <Button type="button" onClick={start} disabled={loading || !canStart} className="h-8">
          Iniciar ngrok
        </Button>
        <Button type="button" variant="outline" onClick={stop} disabled={loading} className="h-8 border-white/10 bg-zinc-900/60">
          Parar
        </Button>
        <Button type="button" variant="outline" onClick={() => refresh()} disabled={loading} className="h-8 border-white/10 bg-zinc-900/60">
          Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs text-gray-300">
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className={showRunning ? 'text-emerald-400' : 'text-gray-500'}>
            {showRunning ? 'Ativo' : 'Parado'}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-gray-500">
          {status?.publicUrl ? `Webhook: ${webhookUrl}` : 'Ainda sem URL pública. Clique em “Atualizar” após iniciar.'}
        </div>
        {canCopy ? (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyUrl}
              className="h-8 border-white/10 bg-zinc-900/60 text-xs"
            >
              Copiar URL
            </Button>
          </div>
        ) : null}
        {showApiError ? (
          <div className="mt-2 text-[11px] text-amber-300">
            Não consegui acessar o painel local do ngrok (localhost:4040).
            {hasNgrok ? (
              <div className="mt-1 text-[11px] text-amber-200">
                Vou tentar iniciar automaticamente. Se demorar, clique em “Atualizar”.
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-amber-200">
                Instale o ngrok e autentique: ngrok config add-authtoken SEU_TOKEN
              </div>
            )}
          </div>
        ) : null}
      </div>

      {showApiError ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs text-gray-300">
          <div className="text-[11px] text-gray-400 mb-1">Alternativa (cloudflared)</div>
          <div className="text-[11px] text-gray-300">
            cloudflared tunnel --url http://localhost:{port || '3000'}
          </div>
          {!hasCloudflared ? (
            <div className="mt-1 text-[11px] text-amber-200">
              Instale o cloudflared para usar esse modo.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
