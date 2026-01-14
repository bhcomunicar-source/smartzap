'use client';

import React from 'react';
import { CampaignTelemetryPanelProps } from './types';

export const CampaignTelemetryPanel: React.FC<CampaignTelemetryPanelProps> = ({
  telemetry,
}) => {
  return (
    <div className="mt-4 glass-panel rounded-2xl p-5 border border-white/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-bold">Debug - Telemetria de latencia</h3>
          <p className="text-xs text-gray-500">
            Best-effort. Util para entender se o atraso esta no broadcast, no realtime do DB ou no refetch.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-1 border text-amber-200 bg-amber-500/10 border-amber-500/20">
          experimental
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
          <div className="text-gray-500 text-xs">Broadcast - UI</div>
          {telemetry.broadcast ? (
            <div className="mt-2 text-xs text-gray-300 space-y-1">
              <div>
                server-client: <span className="font-mono text-gray-200">{Math.round(telemetry.broadcast.serverToClientMs)}ms</span>
              </div>
              <div>
                client-paint: <span className="font-mono text-gray-200">{Math.round(telemetry.broadcast.handlerToPaintMs)}ms</span>
              </div>
              <div>
                total: <span className="font-mono text-gray-200">{Math.round(telemetry.broadcast.serverToPaintMs)}ms</span>
              </div>
              <div className="pt-1 text-[11px] text-gray-500">
                trace: <span className="font-mono">{telemetry.broadcast.traceId || '—'}</span> - seq:{' '}
                <span className="font-mono">{telemetry.broadcast.seq}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">Aguardando evento...</div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
          <div className="text-gray-500 text-xs">DB realtime - UI</div>
          {telemetry.dbChange ? (
            <div className="mt-2 text-xs text-gray-300 space-y-1">
              <div>
                commit-client: <span className="font-mono text-gray-200">{Math.round(telemetry.dbChange.commitToClientMs)}ms</span>
              </div>
              <div>
                client-paint: <span className="font-mono text-gray-200">{Math.round(telemetry.dbChange.handlerToPaintMs)}ms</span>
              </div>
              <div>
                total: <span className="font-mono text-gray-200">{Math.round(telemetry.dbChange.commitToPaintMs)}ms</span>
              </div>
              <div className="pt-1 text-[11px] text-gray-500">
                {telemetry.dbChange.table} - {telemetry.dbChange.eventType}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">Aguardando mudanca...</div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3">
          <div className="text-gray-500 text-xs">Refetch (React Query)</div>
          {telemetry.refetch ? (
            <div className="mt-2 text-xs text-gray-300 space-y-1">
              <div>
                duracao: <span className="font-mono text-gray-200">{Math.round(telemetry.refetch.durationMs ?? 0)}ms</span>
              </div>
              <div className="pt-1 text-[11px] text-gray-500">
                motivo: <span className="font-mono">{telemetry.refetch.reason || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">Sem refetch recente</div>
          )}
        </div>
      </div>
    </div>
  );
};
