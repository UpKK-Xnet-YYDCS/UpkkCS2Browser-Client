import { Suspense, type ReactNode } from 'react';
import { AppHeader } from '@/components/app/AppHeader';
import { ToastContainer } from '@/components/ToastNotification';
import { useAppChromeStyles } from '@/hooks/useAppChromeStyles';
import { useTheme } from '@/hooks/useTheme';
import type { TabId } from '@/hooks/useTabNavigation';

export function AppLayout({
  activeTab,
  onTabChange,
  loginModal,
  children,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  loginModal?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { backgroundStyle, overlayStyle } = useAppChromeStyles(theme);
  const constrainToViewport = activeTab === 'ai';

  return (
    <div
      className={`${constrainToViewport ? 'h-dvh overflow-hidden' : 'min-h-screen overflow-x-hidden'} min-w-0 flex flex-col relative`}
      style={backgroundStyle}
    >
      {theme.backgroundImage && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={overlayStyle}
        />
      )}
      <div className={`${constrainToViewport ? 'h-full min-h-0' : 'min-h-screen'} relative z-10 flex flex-col`}>
        <AppHeader activeTab={activeTab} onTabChange={onTabChange} />
        <main className="min-h-0 flex-1 flex flex-col overflow-hidden">
          <Suspense fallback={<div className="flex-1" />}>
            {children}
          </Suspense>
        </main>
        {loginModal}
        <ToastContainer />
      </div>
    </div>
  );
}
