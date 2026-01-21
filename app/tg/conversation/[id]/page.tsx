'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Send, Bot, User, Phone, Info } from 'lucide-react';
import { useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';
import { useHaptic } from '@/hooks/telegram';
import {
  getConversationById,
  getMessagesByConversationId,
  getStatusEmoji,
  getStatusLabel,
  getStatusColor,
  type MockMessage,
  type MockConversation,
} from '@/lib/telegram/mock-data';

// =============================================================================
// COMPONENTES
// =============================================================================

function MessageBubble({ message }: { message: MockMessage }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`
          max-w-[80%] px-3 py-2 rounded-2xl
          ${isOutbound
            ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] rounded-br-md'
            : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] rounded-bl-md'
          }
        `}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          {message.isAiGenerated && (
            <Bot size={12} className="opacity-60" />
          )}
          <span className="text-[10px] opacity-60">
            {message.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOutbound && (
            <span className="text-[10px] opacity-60">
              {message.deliveryStatus === 'read' && '✓✓'}
              {message.deliveryStatus === 'delivered' && '✓✓'}
              {message.deliveryStatus === 'sent' && '✓'}
              {message.deliveryStatus === 'pending' && '⏳'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ conversation }: { conversation: MockConversation }) {
  const isUrgent = conversation.status === 'handoff_requested';
  const isHuman = conversation.status === 'human_active';

  if (conversation.status === 'resolved') return null;

  return (
    <div className={`
      px-4 py-2 flex items-center justify-between
      ${isUrgent ? 'bg-red-500/10' : isHuman ? 'bg-green-500/10' : 'bg-blue-500/10'}
    `}>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${getStatusColor(conversation.status)}`}>
          {getStatusEmoji(conversation.status)} {getStatusLabel(conversation.status)}
        </span>
      </div>
      {isUrgent && (
        <span className="text-xs text-red-400">Cliente aguardando</span>
      )}
    </div>
  );
}

function ActionButtons({
  conversation,
  onTakeOver,
  onReturnToAI,
}: {
  conversation: MockConversation;
  onTakeOver: () => void;
  onReturnToAI: () => void;
}) {
  const { selection } = useHaptic();
  const isAIActive = conversation.status === 'ai_active' || conversation.status === 'handoff_requested';

  return (
    <div className="flex gap-2 px-4 py-2 border-b border-[var(--tg-theme-secondary-bg-color)]">
      {isAIActive ? (
        <button
          onClick={() => {
            selection();
            onTakeOver();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors"
        >
          <User size={16} />
          Assumir Atendimento
        </button>
      ) : (
        <button
          onClick={() => {
            selection();
            onReturnToAI();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
        >
          <Bot size={16} />
          Devolver para IA
        </button>
      )}
      <button
        onClick={() => selection()}
        className="px-3 py-2 rounded-lg bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)] hover:text-[var(--tg-theme-text-color)] transition-colors"
      >
        <Info size={16} />
      </button>
    </div>
  );
}

// =============================================================================
// PÁGINA DE CONVERSA
// =============================================================================

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert, hapticFeedback } = useTelegramSDK();
  const { notification, impact } = useHaptic();

  const conversationId = params.id as string;
  const [conversation, setConversation] = useState<MockConversation | null>(null);
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Carregar dados mock
  useEffect(() => {
    const conv = getConversationById(conversationId);
    const msgs = getMessagesByConversationId(conversationId);

    if (conv) {
      setConversation(conv);
      setMessages(msgs);
    } else {
      showAlert('Conversa não encontrada');
      router.push('/tg');
    }
  }, [conversationId, router, showAlert]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    impact('medium');

    // Adicionar mensagem localmente
    const tempMessage: MockMessage = {
      id: `msg_temp_${Date.now()}`,
      conversationId,
      direction: 'outbound',
      content: newMessage.trim(),
      messageType: 'text',
      deliveryStatus: 'pending',
      createdAt: new Date(),
      isAiGenerated: false,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');

    // Simular envio
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Atualizar status para "sent"
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempMessage.id ? { ...m, deliveryStatus: 'sent' as const } : m
      )
    );

    // Simular "delivered" após 1s
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id ? { ...m, deliveryStatus: 'delivered' as const } : m
        )
      );
    }, 1000);

    // Simular "read" após 2s
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id ? { ...m, deliveryStatus: 'read' as const } : m
        )
      );
      notification('success');
    }, 2000);

    setIsSending(false);
  };

  const handleTakeOver = () => {
    if (!conversation) return;
    notification('success');
    setConversation({ ...conversation, status: 'human_active' });
    showAlert('Você assumiu o atendimento!\n\nO bot foi pausado para esta conversa.');
  };

  const handleReturnToAI = () => {
    if (!conversation) return;
    notification('warning');
    setConversation({ ...conversation, status: 'ai_active' });
    showAlert('Conversa devolvida para IA\n\nO bot voltará a responder automaticamente.');
  };

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--tg-theme-button-color)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="shrink-0 px-2 py-3 border-b border-[var(--tg-theme-secondary-bg-color)] bg-[var(--tg-theme-bg-color)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/tg')}
            className="p-2 rounded-lg hover:bg-[var(--tg-theme-secondary-bg-color)] transition-colors"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="w-10 h-10 rounded-full bg-[var(--tg-theme-secondary-bg-color)] flex items-center justify-center text-sm font-medium shrink-0">
            {conversation.contactName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-medium truncate">{conversation.contactName}</h1>
            <p className="text-xs text-[var(--tg-theme-hint-color)] truncate">
              {conversation.contactPhone}
            </p>
          </div>

          <button className="p-2 rounded-lg hover:bg-[var(--tg-theme-secondary-bg-color)] transition-colors">
            <Phone size={20} className="text-[var(--tg-theme-hint-color)]" />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--tg-theme-secondary-bg-color)] transition-colors">
            <MoreVertical size={20} className="text-[var(--tg-theme-hint-color)]" />
          </button>
        </div>
      </header>

      {/* Status banner */}
      <StatusBanner conversation={conversation} />

      {/* Action buttons */}
      <ActionButtons
        conversation={conversation}
        onTakeOver={handleTakeOver}
        onReturnToAI={handleReturnToAI}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 border-t border-[var(--tg-theme-secondary-bg-color)] bg-[var(--tg-theme-bg-color)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite uma mensagem..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] placeholder:text-[var(--tg-theme-hint-color)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--tg-theme-button-color)]/50 max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="w-10 h-10 rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
