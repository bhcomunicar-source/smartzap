'use client';

import React from 'react';
import { Search, Filter, RefreshCw, Eye, Ban, AlertCircle, Pencil, Loader2 } from 'lucide-react';
import { MessageStatus } from '@/types';
import { humanizePrecheckReason } from '@/lib/precheck-humanizer';
import { MessageStatusBadge } from './MessageStatusBadge';
import { MessageLogTableProps } from './types';

export const MessageLogTable: React.FC<MessageLogTableProps> = ({
  messages,
  messageStats,
  searchTerm,
  setSearchTerm,
  filterStatus,
  includeReadInDelivered,
  setIncludeReadInDelivered,
  canLoadMore,
  onLoadMore,
  isLoadingMore,
  onQuickEditContact,
}) => {
  const total = Number(messageStats?.total ?? messages.length);
  const shown = Number(messages.length);
  const showLoadMore = Boolean(canLoadMore && onLoadMore);
  const showPagination = total > 0 && shown < total;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          Logs de Envio{' '}
          <span className="text-xs font-normal text-gray-500 bg-zinc-900 px-2 py-0.5 rounded-full">
            {total.toLocaleString()}
          </span>
        </h3>

        <div className="flex gap-2">
          {filterStatus === MessageStatus.DELIVERED && setIncludeReadInDelivered && (
            <button
              type="button"
              onClick={() => setIncludeReadInDelivered(!includeReadInDelivered)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${
                includeReadInDelivered
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/15'
                  : 'bg-zinc-900/50 border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
              }`}
              title={includeReadInDelivered
                ? 'Mostrando entregues + lidas (cumulativo)'
                : 'Mostrando apenas entregues (nao lidas)'}
            >
              <Eye size={14} />
              {includeReadInDelivered ? 'Inclui lidas' : 'So nao lidas'}
            </button>
          )}

          <div className="flex items-center gap-2 bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-1.5 w-full sm:w-64 focus-within:border-primary-500/50 transition-all">
            <Search size={14} className="text-gray-500" />
            <input
              type="text"
              placeholder="Buscar destinatario..."
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
            <Filter size={16} />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/10 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">Destinatario</th>
              <th className="px-6 py-3 font-medium">Telefone</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Horario</th>
              <th className="px-6 py-3 font-medium">Info</th>
              <th className="px-6 py-3 font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {messages.map((msg) => (
              <tr key={msg.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-200">{msg.contactName}</td>
                <td className="px-6 py-3 font-mono text-xs text-gray-500">{msg.contactPhone}</td>
                <td className="px-6 py-3">
                  <MessageStatusBadge status={msg.status} />
                </td>
                <td className="px-6 py-3 text-gray-500 text-xs">{msg.sentAt}</td>
                <td className="px-6 py-3">
                  {msg.error ? (
                    <span
                      className={`text-xs flex items-center gap-1 ${
                        msg.status === MessageStatus.SKIPPED
                          ? 'text-amber-300'
                          : 'text-red-400'
                      }`}
                    >
                      {msg.status === MessageStatus.SKIPPED ? <Ban size={10} /> : <AlertCircle size={10} />}
                      {(() => {
                        const h = humanizePrecheckReason(String(msg.error || ''));
                        return (
                          <span>{h.title}</span>
                        );
                      })()}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {msg.contactId && msg.status === MessageStatus.SKIPPED && msg.error ? (
                    <button
                      onClick={() => {
                        const h = humanizePrecheckReason(String(msg.error));
                        onQuickEditContact(msg.contactId!, h?.focus || null);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      title="Corrigir contato sem sair da campanha"
                    >
                      <Pencil size={12} /> Corrigir contato
                    </button>
                  ) : (
                    <span className="text-gray-600 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>

        {showPagination && (
          <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500">
              Mostrando <span className="font-mono text-gray-300">{shown}</span> de{' '}
              <span className="font-mono text-gray-300">{total}</span>
            </div>

            {showLoadMore ? (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={!!isLoadingMore}
                className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-xs font-medium disabled:opacity-50"
              >
                {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
                {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            ) : (
              <div className="text-xs text-gray-600">(Esta tela carrega ate 100 por vez)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
