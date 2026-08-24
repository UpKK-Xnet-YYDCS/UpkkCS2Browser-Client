import { Suspense, lazy } from 'react';
import { CloudUserStatusButton } from '@/components/CloudUserStatusButton';
import { TabNavigation } from '@/components/TabNavigation';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { useAppChromeStyles } from '@/hooks/useAppChromeStyles';
import type { TabId } from '@/hooks/useTabNavigation';

const SteamClientSwitch = lazy(() => import('@/components/SteamClientSwitch'));

export function AppHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const { headerColor, logoGradient, titleColor } = useAppChromeStyles(theme);

  return (
    <header
      className={`sticky top-0 z-50 shrink-0 border-b border-gray-200 dark:border-gray-700 shadow-sm ${
        theme.glassEffect || theme.backgroundImage ? 'backdrop-blur-xl' : ''
      }`}
      style={{ backgroundColor: headerColor }}
    >
      <div className="max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={logoGradient}
            >
              <span className="text-white font-bold text-lg">U</span>
            </div>
            <div className="hidden sm:block">
              <h1
                className="text-lg font-bold"
                style={titleColor}
              >
                {t.appName}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="order-3 w-full min-w-0 sm:order-none sm:flex sm:w-auto sm:flex-1 sm:justify-center">
            <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />
          </div>

          <div className="order-2 flex flex-shrink-0 items-center gap-2 sm:order-none sm:gap-3">
            <CloudUserStatusButton />
            {language === 'zh-CN' && (
              <Suspense fallback={null}>
                <SteamClientSwitch t={t} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
