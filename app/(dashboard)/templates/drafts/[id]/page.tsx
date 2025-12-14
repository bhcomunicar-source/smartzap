'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Page, PageActions, PageHeader, PageTitle, PageDescription } from '@/components/ui/page'
import { manualDraftsService } from '@/services/manualDraftsService'
import { ManualTemplateBuilder } from '@/components/features/templates/ManualTemplateBuilder'

export default function ManualDraftEditorPage({
  params,
}: {
  // Em páginas client do Next, `params` pode ser Promise.
  // Precisamos desempacotar com `React.use()` antes de acessar as propriedades.
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = React.use(params)

  // Em Client Components, o HTML pode ser renderizado no servidor.
  // Não podemos executar fetch autenticado (cookies do browser) durante SSR.
  // Então habilitamos a query apenas após o componente montar no browser.
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const draftQuery = useQuery({
    queryKey: ['templates', 'drafts', 'manual', id],
    queryFn: async () => manualDraftsService.get(id),
    enabled: mounted && !!id,
  })

  const updateMutation = useMutation({
    mutationFn: async (spec: unknown) => manualDraftsService.update(id, { spec }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'drafts', 'manual'] })
      queryClient.invalidateQueries({ queryKey: ['templates', 'drafts', 'manual', id] })
      toast.success('Rascunho salvo')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao salvar rascunho'),
  })

  const submitMutation = useMutation({
    mutationFn: async () => manualDraftsService.submit(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'drafts', 'manual'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success(`Enviado para a Meta (${res.status || 'PENDING'})`)
      router.push('/templates')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao enviar'),
  })

  const draft = draftQuery.data
  const loadErrorMessage = draftQuery.error instanceof Error ? draftQuery.error.message : 'Erro desconhecido'

  const shouldShowLoading = !mounted || draftQuery.isLoading

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="border-white/10 bg-zinc-900 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <PageTitle>Builder de Template (Manual)</PageTitle>
            <PageDescription>
              Editor no estilo Meta. Salve, valide e envie para aprovação.
            </PageDescription>
          </div>
        </div>

        <PageActions>
          <Button
            variant="outline"
            onClick={() => updateMutation.mutate(draft?.spec)}
            disabled={!draft || updateMutation.isPending}
            className="border-white/10 bg-zinc-900 hover:bg-white/5"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!draft || submitMutation.isPending}
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar para a Meta
          </Button>
        </PageActions>
      </PageHeader>

      {shouldShowLoading ? (
        <div className="glass-panel p-8 rounded-xl text-gray-300 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando rascunho...
        </div>
      ) : draftQuery.isError ? (
        <div className="glass-panel p-8 rounded-xl text-red-300 space-y-3">
          <div className="font-medium">Falha ao carregar rascunho.</div>
          <div className="text-sm text-red-200/90 whitespace-pre-wrap">{loadErrorMessage}</div>
          <div>
            <Button
              variant="outline"
              onClick={() => draftQuery.refetch()}
              className="border-white/10 bg-zinc-900 hover:bg-white/5"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : !draft ? (
        <div className="glass-panel p-8 rounded-xl text-gray-300">Rascunho não encontrado.</div>
      ) : (
        <ManualTemplateBuilder
          id={draft.id}
          initialSpec={draft.spec}
          onSpecChange={(spec) => {
            // Otimista: mantém o spec no cache para o botão Salvar usar
            queryClient.setQueryData(['templates', 'drafts', 'manual', id], (prev: any) => ({ ...prev, spec }))
          }}
          onSave={(spec) => updateMutation.mutate(spec)}
          isSaving={updateMutation.isPending}
        />
      )}
    </Page>
  )
}
