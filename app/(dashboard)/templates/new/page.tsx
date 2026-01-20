'use client';

import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { VenetianMask, Megaphone, Wrench } from 'lucide-react';

import React, { useState } from 'react';
import type { AIStrategy } from '@/components/templates/StrategySelectorModal';

// Lazy load StrategySelectorModal (~30-50KB reduction)
const StrategySelectorModal = dynamic(
  () => import('@/components/templates/StrategySelectorModal').then(m => ({ default: m.StrategySelectorModal })),
  { loading: () => null }
);
import { useRouter } from 'next/navigation';
import { useTemplateProjectMutations } from '@/hooks/useTemplateProjects';
import { toast } from 'sonner';
import {
    Sparkles,
    ArrowLeft,
    Wand2,
    Loader2,
    Check,
    Save,
    AlertCircle
} from 'lucide-react';
import { GeneratedTemplate } from '@/lib/ai/services/template-agent';
import { templateService } from '@/lib/whatsapp/template.service';
import { Page, PageHeader, PageTitle } from '@/components/ui/page';

export default function NewTemplateProjectPage() {
    const router = useRouter();
    const { createProject, isCreating } = useTemplateProjectMutations();

    // Steps: 'config' | 'generating' | 'review'
    const [step, setStep] = useState<'config' | 'generating' | 'review'>('config');

    // Config State
    const [prompt, setPrompt] = useState('');
    const [quantity, setQuantity] = useState(5);
    const [language, setLanguage] = useState('pt_BR');
    const [universalUrl, setUniversalUrl] = useState('');
    const [strategy, setStrategy] = useState<AIStrategy | null>(null);

    // Results State
    const [generatedTemplates, setGeneratedTemplates] = useState<GeneratedTemplate[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Generation Handler
    const handleGenerate = async () => {
        if (!prompt) return toast.error('Digite um comando para a IA');

        console.log('[NewTemplateProjectPage] Generating with Strategy:', strategy);

        setStep('generating');
        try {
            const response = await templateService.generateUtilityTemplates({
                prompt,
                quantity,
                language: language as any,
                strategy: strategy || 'bypass'
            });

            let templates = response.templates;

            // Apply universal URL if provided
            if (universalUrl && templates) {
                templates = templates.map(t => ({
                    ...t,
                    buttons: t.buttons?.map(b => ({
                        ...b,
                        url: b.type === 'URL' ? universalUrl : b.url
                    }))
                }));
            }

            setGeneratedTemplates(templates);
            // Auto-select all approved or fixed
            const valid = templates.filter(t => !t.judgment || t.judgment.approved || t.wasFixed);
            setSelectedIds(new Set(valid.map(t => t.id)));

            setStep('review');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar templates');
            setStep('config');
        }
    };

    // Save Project Handler
    const handleSaveProject = async () => {
        if (selectedIds.size === 0) return toast.error('Selecione pelo menos um template');

        try {
            const selected = generatedTemplates.filter(t => selectedIds.has(t.id));

            await createProject({
                title: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
                prompt: prompt,
                status: 'draft',
                items: selected.map(t => ({
                    name: t.name,
                    content: t.content,
                    header: t.header,
                    footer: t.footer,
                    buttons: t.buttons,
                    language: t.language || language,
                    category: t.category, // Pass the category (MARKETING/UTILITY)
                    meta_status: undefined // Start as Draft
                }))
            });

            // Redirect handled by mutation onSuccess
        } catch (error) {
            // Error handled by mutation
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <Page>
            <PageHeader>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full border border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <PageTitle className="text-[var(--ds-text-primary)]">Novo Projeto de Templates</PageTitle>
                    {strategy && (
                        <Badge variant="outline" className="ml-2 gap-2 py-1 px-3 border-[var(--ds-border-default)] text-[var(--ds-text-secondary)]">
                            {strategy === 'marketing' && <Megaphone className="w-3 h-3" />}
                            {strategy === 'utility' && <Wrench className="w-3 h-3" />}
                            {strategy === 'bypass' && <VenetianMask className="w-3 h-3" />}
                            Modo: {strategy.toUpperCase()}
                        </Badge>
                    )}
                </div>
            </PageHeader>

            <StrategySelectorModal
                isOpen={!strategy}
                onSelect={setStrategy}
                onClose={() => router.push('/templates')}
            />


            {strategy && step === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Input */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                            <div className="flex items-center gap-2 mb-4 text-emerald-700 dark:text-emerald-200">
                                <Sparkles className="w-5 h-5" />
                                <h2 className="font-semibold text-[var(--ds-text-primary)]">O que você deseja criar?</h2>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Ex: Templates para confirmação de agendamento de consulta médica com opção de remarcar..."
                                className="w-full h-40 p-4 rounded-xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] focus:ring-2 focus:ring-emerald-500/30 outline-none resize-none text-base text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
                            />

                            <div className="flex items-center justify-between mt-4 text-xs text-[var(--ds-text-muted)]">
                                <span>Dica: Seja específico sobre o objetivo e tom de voz.</span>
                                <span>{prompt.length} caracteres</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                                <label className="block text-xs uppercase tracking-widest text-[var(--ds-text-muted)] mb-2">Quantidade</label>
                                <select
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full h-11 rounded-xl bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] px-3 text-[var(--ds-text-primary)]"
                                >
                                    <option value={3}>3 Opções</option>
                                    <option value={5}>5 Opções</option>
                                    <option value={10}>10 Opções</option>
                                </select>
                            </div>

                            <div className="rounded-2xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                                <label className="block text-xs uppercase tracking-widest text-[var(--ds-text-muted)] mb-2">Idioma</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full h-11 rounded-xl bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] px-3 text-[var(--ds-text-primary)]"
                                >
                                    <option value="pt_BR">Português (Brasil)</option>
                                    <option value="en_US">Inglês (EUA)</option>
                                    <option value="es_ES">Espanhol</option>
                                </select>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                            <label className="block text-xs uppercase tracking-widest text-[var(--ds-text-muted)] mb-2">URL Padrão (Opcional)</label>
                            <input
                                type="url"
                                value={universalUrl}
                                onChange={(e) => setUniversalUrl(e.target.value)}
                                placeholder="https://seu-site.com"
                                className="w-full h-11 rounded-xl bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] px-3 text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
                            />
                            <p className="text-xs text-[var(--ds-text-muted)] mt-1">Será usada nos botões dos templates gerados.</p>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={!prompt}
                            className="w-full py-4 bg-primary-600 text-white dark:bg-white dark:text-black rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-primary-700 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Wand2 className="w-5 h-5" />
                            Gerar Templates com IA
                        </button>
                    </div>

                    {/* Right: Info */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-emerald-400 dark:border-emerald-400/20 bg-emerald-100 dark:bg-emerald-500/10 p-6 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                            <h3 className="font-semibold text-emerald-700 dark:text-emerald-200 mb-2">Como funciona?</h3>
                            <ul className="space-y-3 text-sm text-[var(--ds-text-secondary)]">
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    Nossa IA Agent analisa seu pedido e busca as melhores práticas da Meta.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    Gera templates otimizados para aprovação na categoria UTILIDADE.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    O AI Judge verifica as regras e corrige proibições automaticamente.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {step === 'generating' && (
                <div className="flex flex-col items-center justify-center min-h-100">
                    <Loader2 className="w-12 h-12 text-emerald-300 animate-spin mb-4" />
                    <h2 className="text-xl font-semibold text-[var(--ds-text-primary)] mb-2">Criando seus templates...</h2>
                    <p className="text-[var(--ds-text-muted)]">O Agente está consultando as diretrizes da Meta e gerando variações.</p>
                </div>
            )}

            {step === 'review' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-[var(--ds-text-primary)]">Revise os Templates Gerados</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--ds-text-muted)]">{selectedIds.size} selecionados</span>
                            <button
                                onClick={handleSaveProject}
                                disabled={isCreating || selectedIds.size === 0}
                                className="px-6 py-2 bg-primary-600 text-white dark:bg-white dark:text-black rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-700 dark:hover:bg-gray-200 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar Projeto
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {generatedTemplates.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => toggleSelect(t.id)}
                                className={`
                  relative p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)]
                  ${selectedIds.has(t.id)
                                        ? 'border-emerald-600 dark:border-emerald-400/40 bg-emerald-100 dark:bg-emerald-500/10'
                                        : 'border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)]'}
                `}
                            >
                                {selectedIds.has(t.id) && (
                                    <div className="absolute top-2 right-2 p-1 bg-emerald-500 text-black rounded-full">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}

                                {/* Header */}
                                <div className="mb-3">
                                    <span className="text-xs font-mono text-[var(--ds-text-muted)]">{t.name}</span>
                                    {t.header && (
                                        <div className="mt-1 font-semibold text-sm text-[var(--ds-text-primary)]">
                                            {t.header.text || `[Mídia: ${t.header.format}]`}
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="text-sm text-[var(--ds-text-secondary)] whitespace-pre-wrap mb-4">
                                    {t.content}
                                </div>

                                {/* Footer */}
                                {t.footer && (
                                    <div className="mb-3 text-xs text-[var(--ds-text-muted)]">
                                        {t.footer.text}
                                    </div>
                                )}

                                {/* Buttons */}
                                {t.buttons && t.buttons.length > 0 && (
                                    <div className="space-y-2">
                                        {t.buttons.map((btn, i) => (
                                            <div key={i} className="w-full py-2 px-3 bg-[var(--ds-bg-elevated)] text-center text-emerald-700 dark:text-emerald-200 text-sm rounded font-medium border border-[var(--ds-border-default)]">
                                                {btn.type === 'URL' && <span className="mr-1">🔗</span>}
                                                {btn.text}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* AI Judgment Badge */}
                                {t.judgment && !t.judgment.approved && (
                                    <div className="mt-4 p-2 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-200 text-xs rounded border border-amber-400 dark:border-amber-500/20 flex items-start gap-1">
                                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold">Atenção:</span> {t.judgment.issues[0]?.reason || 'Problemas detectados'}
                                        </div>
                                    </div>
                                )}
                                {t.wasFixed && (
                                    <div className="mt-4 p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 text-xs rounded border border-emerald-400 dark:border-emerald-500/20 flex items-start gap-1">
                                        <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-emerald-300" />
                                        <div>
                                            Corrigido automaticamente pelo AI Judge
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Page>
    );
}
