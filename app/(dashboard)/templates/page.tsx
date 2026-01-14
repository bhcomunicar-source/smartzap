'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTemplatesController } from '@/hooks/useTemplates';
import { useLeadFormsController } from '@/hooks/useLeadForms'
import { TemplateListView } from '@/components/features/templates/TemplateListView';
import { useTemplateProjectsQuery, useTemplateProjectMutations } from '@/hooks/useTemplateProjects';
import { Loader2, Plus, Folder, Search, RefreshCw, CheckCircle, AlertTriangle, Trash2, LayoutGrid, Sparkles, Zap, Workflow, FileText, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from '@/components/ui/page';
import { Button } from '@/components/ui/button';

import { FlowPublishPanel } from '@/components/features/flows/FlowPublishPanel'
import { flowsService } from '@/services/flowsService'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LeadFormsView } from '@/components/features/lead-forms/LeadFormsView'

// Status Badge Component
const StatusBadge = ({ status, approvedCount, totalCount }: { status: string; approvedCount?: number; totalCount?: number }) => {
  const isDraft = status === 'draft';
  const isComplete = approvedCount && totalCount && approvedCount === totalCount && totalCount > 0;
  const isPartial = approvedCount && approvedCount > 0 && !isComplete;

  if (isComplete) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
        Concluído
      </span>
    );
  }
  if (isPartial) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-amber-500/10 text-amber-300 border-amber-500/20">
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        Em Progresso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
      Rascunho
    </span>
  );
};

const AIFeatureWarningBanner = () => (
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start sm:items-center gap-3">
    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
    <div className="min-w-0">
      <p className="text-amber-200 font-medium text-sm">
        Funcionalidade em desenvolvimento
      </p>
      <p className="text-amber-300/70 text-sm mt-0.5">
        Criação de templates com I.A ainda não está funcionando. Aguarde um pouco mais.
      </p>
    </div>
  </div>
);

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const controller = useTemplatesController();
  const { data: projects, isLoading: isLoadingProjects, refetch } = useTemplateProjectsQuery();
  const { deleteProject } = useTemplateProjectMutations();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'projects' | 'meta' | 'flows' | 'forms'>('meta');
  const [isCreatingFlow, setIsCreatingFlow] = React.useState(false);
  const leadFormsController = useLeadFormsController()

  const handleCreateManualTemplate = async () => {
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = `template_${stamp}`
    try {
      const created = await controller.createManualDraft({
        name,
        category: 'MARKETING',
        language: 'pt_BR',
        parameterFormat: 'positional',
      })
      if (created?.id) {
        router.push(`/templates/drafts/${encodeURIComponent(created.id)}`)
      }
    } catch {
      // Toast já é emitido no controller.
    }
  }

  // Flows hub state
  const flowsQuery = useQuery({
    queryKey: ['flows'],
    queryFn: flowsService.list,
    staleTime: 10_000,
    enabled: activeTab === 'flows',
  })
  const builderFlows = flowsQuery.data || []
  const handleQuickCreateFlow = async () => {
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const name = `flow_${stamp}`
    try {
      setIsCreatingFlow(true)
      const created = await flowsService.create({ name })
      router.push(`/flows/builder/${encodeURIComponent(created.id)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar MiniApp')
    } finally {
      setIsCreatingFlow(false)
    }
  }

  // Deep-link: /templates?tab=flows
  React.useEffect(() => {
    const tab = (searchParams?.get('tab') || '').toLowerCase()
    if (tab === 'drafts') {
      // Compat: aba antiga virou filtro no tab principal.
      setActiveTab('meta')
      controller.setStatusFilter('DRAFT')
      router.replace('/templates?tab=meta')
      return
    }
    if (tab === 'meta' || tab === 'projects' || tab === 'flows' || tab === 'forms') {
      setActiveTab((prev) => ((prev as any) === tab ? prev : (tab as any)))
    }
  }, [controller, router, searchParams])

  const setTab = (tab: 'projects' | 'meta' | 'flows' | 'forms') => {
    setActiveTab(tab)
    router.replace(`/templates?tab=${encodeURIComponent(tab)}`)
  }

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteProject(id);
  };

  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];
    if (!searchTerm) return projects;
    return projects.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  return (
    <Page>
      {/* Aviso (topo): fica acima do título */}
      {activeTab === 'projects' && <AIFeatureWarningBanner />}

      <PageHeader>
        <div>
          <PageTitle>Templates</PageTitle>
          <PageDescription>
            {activeTab === 'flows'
              ? 'Crie e monitore MiniApps do WhatsApp, e mapeie respostas para campos do SmartZap.'
              : activeTab === 'forms'
                ? 'Crie formulários públicos para captar contatos e tags automaticamente.'
              : 'Gerencie templates e rascunhos.'}
          </PageDescription>
        </div>
        <PageActions>
          {activeTab === 'meta' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCreateManualTemplate}
                className="border-white/10 bg-zinc-950/40 hover:bg-white/5 text-gray-200"
              >
                <FileText className="w-4 h-4" />
                Criar template
              </Button>

              <Button
                onClick={() => controller.setIsBulkModalOpen(true)}
                className="bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
              >
                <Zap className="w-4 h-4 text-emerald-900" />
                Gerar UTILITY em Massa
              </Button>

              <Button
                onClick={() => controller.setIsAiModalOpen(true)}
                className="bg-zinc-950/40 text-gray-200 border border-white/10 hover:bg-white/5 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-300" />
                Criar com IA
              </Button>

              <Button
                variant="outline"
                onClick={controller.onSync}
                disabled={controller.isSyncing}
                className="border-white/10 bg-zinc-950/40 hover:bg-white/5 text-gray-200"
              >
                <RefreshCw className={cn('w-4 h-4', controller.isSyncing ? 'animate-spin' : '')} />
                {controller.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </div>
          )}

          {activeTab === 'projects' && (
            <button
              onClick={() => router.push('/templates/new')}
              className="bg-white text-black px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors hover:bg-gray-200"
            >
              <Plus className="w-5 h-5" />
              Novo Projeto
            </button>
          )}

          {activeTab === 'flows' && (
            <div className="flex items-center gap-2" />
          )}
        </PageActions>
      </PageHeader>

      {/* TABS */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('meta')}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'meta'
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            : 'border-white/10 bg-zinc-950/40 text-gray-400 hover:text-white'
            }`}
        >
          <CheckCircle className="w-4 h-4" />
          Meta (Templates)
        </button>

        <button
          onClick={() => setTab('flows')}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'flows'
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            : 'border-white/10 bg-zinc-950/40 text-gray-400 hover:text-white'
            }`}
        >
          <Workflow className="w-4 h-4" />
          MiniApps
          <span className="rounded-full bg-emerald-500/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-emerald-200 border border-emerald-500/30">
            beta
          </span>
        </button>

        <button
          onClick={() => setTab('forms')}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'forms'
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            : 'border-white/10 bg-zinc-950/40 text-gray-400 hover:text-white'
            }`}
        >
          <FileText className="w-4 h-4" />
          Forms
          <span className="rounded-full bg-emerald-500/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-emerald-200 border border-emerald-500/30">
            beta
          </span>
        </button>

        <button
          onClick={() => setTab('projects')}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'projects'
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            : 'border-white/10 bg-zinc-950/40 text-gray-400 hover:text-white'
            }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Projetos (Fábrica)
          <span className="rounded-full bg-emerald-500/20 px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-emerald-200 border border-emerald-500/30">
            beta
          </span>
        </button>
      </div>

      {activeTab === 'meta' && (
        <TemplateListView
          {...controller}
          hideHeader
          onCreateCampaign={(template) => {
            router.push(`/campaigns/new?templateName=${encodeURIComponent(template.name)}`)
          }}
        />
      )}

      {activeTab === 'flows' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Criar MiniApp</div>
                <div className="text-xs text-gray-400">
                  Crie um MiniApp e abra direto o builder para editar.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleQuickCreateFlow}
                  disabled={isCreatingFlow}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  {isCreatingFlow ? 'Criando…' : 'Criar MiniApp'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/submissions')}
                  className="border-white/10 bg-zinc-950/40 hover:bg-white/5 text-gray-200"
                >
                  <ClipboardList className="w-4 h-4" />
                  Ver Submissões
                </Button>
              </div>
            </div>

            <div id="flow-publish-panel">
              <FlowPublishPanel
                flows={builderFlows}
                isLoading={flowsQuery.isLoading}
                isFetching={flowsQuery.isFetching}
                onRefresh={() => flowsQuery.refetch()}
              />
            </div>

          </div>
        </div>
      )}

      {activeTab === 'forms' && (
        <LeadFormsView
          forms={leadFormsController.forms}
          tags={leadFormsController.tags}
          isLoading={leadFormsController.isLoading}
          error={leadFormsController.error}
          publicBaseUrl={leadFormsController.publicBaseUrl}
          isCreateOpen={leadFormsController.isCreateOpen}
          setIsCreateOpen={leadFormsController.setIsCreateOpen}
          createDraft={leadFormsController.createDraft}
          setCreateDraft={leadFormsController.setCreateDraft}
          onCreate={leadFormsController.create}
          isCreating={leadFormsController.isCreating}
          createError={leadFormsController.createError}
          isEditOpen={leadFormsController.isEditOpen}
          editDraft={leadFormsController.editDraft}
          setEditDraft={leadFormsController.setEditDraft}
          onEdit={leadFormsController.openEdit}
          onCloseEdit={leadFormsController.closeEdit}
          onSaveEdit={leadFormsController.saveEdit}
          isUpdating={leadFormsController.isUpdating}
          updateError={leadFormsController.updateError}
          onDelete={leadFormsController.remove}
          isDeleting={leadFormsController.isDeleting}
          deleteError={leadFormsController.deleteError}
        />
      )}

      {activeTab === 'projects' && (
        <>
          {/* Filters Bar */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-96 bg-zinc-950/40 border border-white/10 rounded-xl px-4 py-3 transition-all">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                placeholder="Buscar projetos..."
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-gray-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/40 border-b border-white/10 text-gray-500 uppercase tracking-widest text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nome</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-center">Templates</th>
                    <th className="px-6 py-4 font-medium">Progresso</th>
                    <th className="px-6 py-4 font-medium">Criado em</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoadingProjects ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nenhum projeto encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => {
                      const approvedPercent = project.template_count > 0
                        ? Math.round((project.approved_count / project.template_count) * 100)
                        : 0;

                      return (
                        <tr
                          key={project.id}
                          onClick={() => router.push(`/templates/${project.id}`)}
                          className="hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                <Folder size={16} />
                              </div>
                              <div>
                                <p className="font-medium text-white group-hover:text-emerald-200 transition-colors">
                                  {project.title}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge
                              status={project.status}
                              approvedCount={project.approved_count}
                              totalCount={project.template_count}
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-gray-400 font-mono">
                            {project.template_count}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 w-24 bg-zinc-800 rounded-full h-1">
                                <div
                                  className="bg-emerald-500 h-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                  style={{ width: `${approvedPercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 font-mono w-10">
                                {approvedPercent}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                            {new Date(project.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => handleDeleteProject(e, project.id)}
                                title="Excluir"
                                className="p-2 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-amber-500/10"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
