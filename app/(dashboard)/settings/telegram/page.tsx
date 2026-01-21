'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Trash2,
  RefreshCw,
  Webhook,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Page, PageDescription, PageHeader, PageTitle } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// =============================================================================
// Types
// =============================================================================

interface TelegramConfig {
  isConfigured: boolean
  botUsername?: string
  botName?: string
  botId?: number
  webhookUrl?: string
  miniAppUrl?: string
  tokenPreview?: string
  error?: string
  warning?: string
}

interface ConfigureResponse {
  success: boolean
  botUsername: string
  botName: string
  botId: number
  webhookUrl: string
  miniAppUrl: string
  message: string
  error?: string
}

// =============================================================================
// API
// =============================================================================

async function fetchTelegramConfig(): Promise<TelegramConfig> {
  const res = await fetch('/api/settings/telegram')
  if (!res.ok) throw new Error('Erro ao buscar configuração')
  return res.json()
}

async function configureTelegram(botToken: string): Promise<ConfigureResponse> {
  const res = await fetch('/api/settings/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botToken }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao configurar')
  return data
}

async function removeTelegramConfig(): Promise<void> {
  const res = await fetch('/api/settings/telegram', { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao remover configuração')
}

// =============================================================================
// Components
// =============================================================================

function StatusBadge({ isConfigured }: { isConfigured: boolean }) {
  if (isConfigured) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle2 size={12} />
        Conectado
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
      <AlertCircle size={12} />
      Não configurado
    </span>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
      title={`Copiar ${label}`}
    >
      <Copy size={14} />
    </button>
  )
}

function InfoRow({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-zinc-200">{value}</span>
        {copyable && <CopyButton text={value} label={label} />}
      </div>
    </div>
  )
}

// =============================================================================
// Main Page
// =============================================================================

export default function TelegramSettingsPage() {
  const queryClient = useQueryClient()
  const [botToken, setBotToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  // Query config
  const {
    data: config,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['telegram-config'],
    queryFn: fetchTelegramConfig,
  })

  // Configure mutation
  const configureMutation = useMutation({
    mutationFn: configureTelegram,
    onSuccess: (data) => {
      toast.success(data.message)
      setBotToken('')
      queryClient.invalidateQueries({ queryKey: ['telegram-config'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: removeTelegramConfig,
    onSuccess: () => {
      toast.success('Configuração removida')
      queryClient.invalidateQueries({ queryKey: ['telegram-config'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleConfigure = () => {
    if (!botToken.trim()) {
      toast.error('Cole o token do bot')
      return
    }
    configureMutation.mutate(botToken.trim())
  }

  const handleRemove = () => {
    if (confirm('Tem certeza que deseja desconectar o bot do Telegram?')) {
      removeMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <Page>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <PageTitle>Telegram Mini App</PageTitle>
              <PageDescription>Configure o bot para acessar o monitor via Telegram</PageDescription>
            </div>
          </div>
          <StatusBadge isConfigured={config?.isConfigured || false} />
        </div>
      </PageHeader>

      <div className="max-w-2xl space-y-6">
        {/* Card de configuração */}
        {!config?.isConfigured ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-medium mb-4">Configurar Bot</h3>

            {/* Instruções */}
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Como obter o token:</h4>
              <ol className="text-sm text-zinc-400 space-y-1.5 list-decimal list-inside">
                <li>Abra o Telegram e procure por <strong className="text-zinc-300">@BotFather</strong></li>
                <li>Envie <code className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs">/newbot</code> para criar um novo bot</li>
                <li>Siga as instruções para escolher nome e username</li>
                <li>Copie o token que o BotFather enviar</li>
              </ol>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-400 hover:text-blue-300"
              >
                Abrir @BotFather
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Input do token */}
            <div className="space-y-2">
              <Label htmlFor="botToken">Token do Bot</Label>
              <div className="relative">
                <Input
                  id="botToken"
                  type={showToken ? 'text' : 'password'}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                O token será usado para configurar webhook e Mini App automaticamente
              </p>
            </div>

            {/* Botão de configurar */}
            <Button
              onClick={handleConfigure}
              disabled={configureMutation.isPending || !botToken.trim()}
              className="mt-4 w-full"
            >
              {configureMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Configurar Bot
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Card do bot configurado */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Bot Conectado</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="text-zinc-400"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Atualizar
                </Button>
              </div>

              <div className="space-y-1">
                <InfoRow label="Nome" value={config.botName || '-'} />
                <InfoRow label="Username" value={`@${config.botUsername}`} copyable />
                <InfoRow label="Bot ID" value={String(config.botId)} />
                <InfoRow label="Token" value={config.tokenPreview || '••••••••'} />
              </div>

              {/* Link direto para o bot */}
              <a
                href={`https://t.me/${config.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium"
              >
                <Bot size={16} />
                Abrir @{config.botUsername}
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Card de URLs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-medium mb-4">Endpoints Configurados</h3>

              <div className="space-y-4">
                {/* Webhook */}
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <Webhook size={16} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Webhook</p>
                    <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                      {config.webhookUrl || 'Não configurado'}
                    </p>
                  </div>
                  {config.webhookUrl && (
                    <CopyButton text={config.webhookUrl} label="Webhook URL" />
                  )}
                </div>

                {/* Mini App */}
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Smartphone size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Mini App</p>
                    <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                      {config.miniAppUrl || window.location.origin + '/tg'}
                    </p>
                  </div>
                  <CopyButton
                    text={config.miniAppUrl || window.location.origin + '/tg'}
                    label="Mini App URL"
                  />
                </div>
              </div>
            </div>

            {/* Botão de remover */}
            <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-6">
              <h3 className="text-lg font-medium text-red-400 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Desconectar o bot removerá o webhook e o botão do Mini App.
              </p>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Desconectar Bot
              </Button>
            </div>
          </>
        )}
      </div>
    </Page>
  )
}
