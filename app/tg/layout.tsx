'use client';

import { useEffect, useState, ReactNode } from 'react';
import { TelegramSDKProvider, useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';
import { usePathname, useRouter } from 'next/navigation';

// =============================================================================
// INNER LAYOUT (dentro do Provider)
// =============================================================================

function TelegramLayoutInner({ children }: { children: ReactNode }) {
  const { isReady, isMock, user, isLinked, isDark } = useTelegramSDK();
  const pathname = usePathname();
  const router = useRouter();

  // Redirecionar para página de link se não estiver vinculado
  useEffect(() => {
    if (!isReady) return;

    const isLinkPage = pathname === '/tg/link';

    if (!isLinked && !isLinkPage) {
      router.replace('/tg/link');
    } else if (isLinked && isLinkPage) {
      router.replace('/tg');
    }
  }, [isReady, isLinked, pathname, router]);

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[var(--tg-theme-bg-color)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--tg-theme-button-color)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--tg-theme-hint-color)] text-sm">
            Carregando SmartZap...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]">
      {/* Mock indicator */}
      {isMock && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-black text-xs text-center py-1 font-medium">
          🤖 MODO SIMULADOR • {user?.firstName} • {isDark ? 'Dark' : 'Light'}
        </div>
      )}

      {/* Content with padding for mock indicator */}
      <div className={isMock ? 'pt-6' : ''}>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN LAYOUT
// =============================================================================

export default function TelegramLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Carregar Eruda em dev para debug
    if (process.env.NODE_ENV === 'development') {
      import('eruda').then((eruda) => {
        eruda.default.init();
        console.log('🔧 Eruda debug console loaded');
      }).catch(() => {
        // Eruda não instalado, ignorar
      });
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TelegramSDKProvider>
      <TelegramLayoutInner>{children}</TelegramLayoutInner>
    </TelegramSDKProvider>
  );
}
