'use client';

import React, { useState } from 'react';
import { ChevronDown, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DetailCard } from './DetailCard';
import { formatDurationMs, formatThroughput } from './utils';
import { CampaignPerformancePanelProps } from './types';

export const CampaignPerformancePanel: React.FC<CampaignPerformancePanelProps> = ({
  isPerfOpen,
  setIsPerfOpen,
  perfSourceLabel,
  metrics,
  perf,
  throughputMpsForUi,
  dispatchDurationMsForUi,
  isPerfEstimatedLive,
  baselineThroughputMedian,
  limiterInfo,
}) => {
  const [isPerfTechOpen, setIsPerfTechOpen] = useState(false);

  return (
    <Collapsible
      open={isPerfOpen}
      onOpenChange={setIsPerfOpen}
      className="mt-4 glass-panel rounded-2xl p-5 border border-white/5"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-start justify-between gap-4 text-left"
          aria-label={isPerfOpen ? 'Recolher performance do disparo' : 'Expandir performance do disparo'}
        >
          <div>
            <h3 className="text-white font-bold">Velocidade do disparo</h3>
            <p className="text-xs text-gray-500">
              Conta apenas o periodo do primeiro envio ate o ultimo envio (sent-only).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-1 border ${perfSourceLabel.tone}`}>
              {perfSourceLabel.label}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform ${isPerfOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4">
        {metrics?.source === 'campaigns_fallback' && (metrics as any)?.hint && (
          <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="font-medium">Metricas avancadas indisponiveis</div>
            <div className="mt-1 text-amber-200/80">{(metrics as any).hint}</div>
          </div>
        )}

        <div className={`${metrics?.source === 'campaigns_fallback' && (metrics as any)?.hint ? 'mt-4' : ''} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
          <div className="sm:col-span-2">
            <DetailCard
              title="Velocidade (throughput)"
              value={formatThroughput(throughputMpsForUi)}
              subvalue={(() => {
                const mps = Number(throughputMpsForUi);
                const hasMps = Number.isFinite(mps) && mps > 0;

                if (!hasMps) {
                  if (!perf?.first_dispatch_at) return 'Ainda nao iniciou (sem first_dispatch_at).';
                  if (!perf?.last_sent_at) return 'Em andamento (sem last_sent_at).';
                  return 'Ainda sem dados suficientes para medir throughput.';
                }

                const baselineText = baselineThroughputMedian
                  ? `Baseline (mediana): ${baselineThroughputMedian.toFixed(2)} msg/s`
                  : 'Sem baseline suficiente (rode mais campanhas para comparar).';

                if (isPerfEstimatedLive) {
                  return `Ao vivo (estimado). ${baselineText}`;
                }

                return baselineText;
              })()}
              icon={CheckCircle2}
              color="#10b981"
            />
          </div>

          <DetailCard
            title="Tempo total"
            value={formatDurationMs(dispatchDurationMsForUi)}
            subvalue="Do primeiro envio ate o ultimo envio"
            icon={Clock}
            color="#a1a1aa"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DetailCard
            title="Limitador atual"
            value={limiterInfo.value}
            subvalue={limiterInfo.subvalue}
            icon={AlertCircle}
            color={limiterInfo.color}
          />

          <div className="sm:col-span-2 glass-panel p-5 rounded-2xl border border-white/5">
            <Collapsible open={isPerfTechOpen} onOpenChange={setIsPerfTechOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 text-left"
                  aria-label={isPerfTechOpen ? 'Recolher detalhes tecnicos' : 'Expandir detalhes tecnicos'}
                >
                  <div>
                    <div className="text-sm text-gray-300 font-medium">Detalhes tecnicos</div>
                    <div className="text-xs text-gray-500">Config aplicada e identificadores (para diagnostico)</div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${isPerfTechOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3">
                <div className="text-xs text-gray-400 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
                    <div className="text-gray-500">Config efetiva</div>
                    <div className="mt-1 font-mono">
                      conc={perf?.config?.effective?.concurrency ?? '—'} | batch={perf?.config?.effective?.configuredBatchSize ?? '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
                    <div className="text-gray-500">Turbo (adaptive)</div>
                    <div className="mt-1 font-mono">
                      {perf?.config?.adaptive
                        ? `enabled=${String(perf.config.adaptive.enabled)} maxMps=${perf.config.adaptive.maxMps}`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
                    <div className="text-gray-500">Hash de config</div>
                    <div className="mt-1 font-mono">{perf?.config_hash ?? '—'}</div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-gray-500">
                  {perf?.trace_id ? (
                    <span>ID da execucao: <span className="font-mono text-gray-400">{perf.trace_id}</span></span>
                  ) : (
                    <span>ID da execucao: <span className="font-mono text-gray-400">—</span></span>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
