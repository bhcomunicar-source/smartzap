'use client';

import React from 'react';
import { FileText, Check } from 'lucide-react';
import { Template } from '../../../../types';
import { TemplateTableRow } from './TemplateTableRow';
import { StatusFilterType } from './types';

export interface TemplateTableProps {
  templates: Template[];
  isLoading: boolean;
  statusFilter: StatusFilterType;
  // Manual draft detection
  manualDraftIds: Set<string>;
  manualDraftSendStateById?: Record<string, { canSend: boolean; reason?: string }>;
  // Selection state
  selectedManualDraftIds: Set<string>;
  selectedMetaTemplates: Set<string>;
  // Selection handlers
  onToggleManualDraft: (id: string) => void;
  onToggleMetaTemplate: (name: string) => void;
  // Draft actions
  submittingManualDraftId: string | null;
  deletingManualDraftId: string | null;
  submitManualDraft: (id: string) => void;
  deleteManualDraft: (id: string) => void;
  // Template actions
  onViewDetails: (template: Template) => void;
  onDeleteClick: (template: Template) => void;
  onCreateCampaign?: (template: Template) => void;
  // Hover
  onHoverTemplate: (templateId: string | null) => void;
  onPrefetchPreview?: (template: Template) => void;
  // Header checkbox
  onToggleAllDrafts: () => void;
  onToggleAllMeta: () => void;
  isAllDraftsSelected: boolean;
  isAllMetaSelected: boolean;
  manualDraftCount: number;
  selectableMetaCount: number;
}

export const TemplateTable: React.FC<TemplateTableProps> = ({
  templates,
  isLoading,
  statusFilter,
  manualDraftIds,
  manualDraftSendStateById,
  selectedManualDraftIds,
  selectedMetaTemplates,
  onToggleManualDraft,
  onToggleMetaTemplate,
  submittingManualDraftId,
  deletingManualDraftId,
  submitManualDraft,
  deleteManualDraft,
  onViewDetails,
  onDeleteClick,
  onCreateCampaign,
  onHoverTemplate,
  onPrefetchPreview,
  onToggleAllDrafts,
  onToggleAllMeta,
  isAllDraftsSelected,
  isAllMetaSelected,
  manualDraftCount,
  selectableMetaCount,
}) => {
  const isManualDraft = (t: Template) => manualDraftIds?.has(t.id);

  const canSendDraft = (t: Template) => {
    const state = manualDraftSendStateById?.[t.id];
    if (state) return state.canSend;
    return String(t.content || '').trim().length > 0;
  };

  const handleHeaderCheckbox = () => {
    if (statusFilter === 'DRAFT') {
      onToggleAllDrafts();
    } else {
      onToggleAllMeta();
    }
  };

  const isHeaderDisabled =
    statusFilter === 'DRAFT' ? manualDraftCount === 0 : selectableMetaCount === 0;

  const isHeaderChecked = statusFilter === 'DRAFT' ? isAllDraftsSelected : isAllMetaSelected;

  const hasItems = statusFilter === 'DRAFT' ? manualDraftCount > 0 : selectableMetaCount > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/40 border-b border-white/10 text-gray-500 uppercase tracking-widest text-xs">
            <tr>
              <th className="px-4 py-4 w-10">
                <button
                  onClick={handleHeaderCheckbox}
                  disabled={isHeaderDisabled}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isHeaderDisabled
                      ? 'border-white/10 opacity-40 cursor-not-allowed'
                      : isHeaderChecked
                        ? statusFilter === 'DRAFT'
                          ? 'bg-amber-500 border-amber-500'
                          : 'bg-emerald-500 border-emerald-500'
                        : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  {isHeaderChecked && hasItems && (
                    <Check
                      className={`w-3 h-3 ${statusFilter === 'DRAFT' ? 'text-black' : 'text-white'}`}
                    />
                  )}
                </button>
              </th>
              <th className="px-4 py-4 font-medium">Nome</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium">Categoria</th>
              <th className="px-4 py-4 font-medium">Idioma</th>
              <th className="px-4 py-4 font-medium max-w-xs">Conteudo</th>
              <th className="px-4 py-4 font-medium">Atualizado</th>
              <th className="px-4 py-4 font-medium text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                  Carregando templates...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="w-16 h-16 bg-zinc-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Nenhum template encontrado</h3>
                  <p className="text-gray-500 text-sm">
                    Tente ajustar os filtros ou clique em sincronizar.
                  </p>
                </td>
              </tr>
            ) : (
              templates.map((template) => {
                const manual = isManualDraft(template);
                const isRowSelected = manual
                  ? selectedManualDraftIds.has(template.id)
                  : selectedMetaTemplates.has(template.name);

                return (
                  <TemplateTableRow
                    key={template.id}
                    template={template}
                    isManualDraft={manual}
                    isRowSelected={isRowSelected}
                    isSubmitting={submittingManualDraftId === template.id}
                    isDeletingDraft={deletingManualDraftId === template.id}
                    canSend={canSendDraft(template)}
                    sendReason={manualDraftSendStateById?.[template.id]?.reason}
                    onToggleSelection={() =>
                      manual ? onToggleManualDraft(template.id) : onToggleMetaTemplate(template.name)
                    }
                    onViewDetails={() => onViewDetails(template)}
                    onDeleteClick={() => onDeleteClick(template)}
                    onSubmitDraft={() => submitManualDraft(template.id)}
                    onDeleteDraft={() => deleteManualDraft(template.id)}
                    onCreateCampaign={onCreateCampaign ? () => onCreateCampaign(template) : undefined}
                    onMouseEnter={() => onHoverTemplate(template.id)}
                    onMouseLeave={() => onHoverTemplate(null)}
                    onPrefetchPreview={onPrefetchPreview ? () => onPrefetchPreview(template) : undefined}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
