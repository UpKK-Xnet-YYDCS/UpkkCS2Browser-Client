import { useCallback, useMemo, lazy, Suspense } from 'react';
import { AppProvider } from './store';
import { UserProvider } from './store/user';
import { ThemeProvider, useTheme, rgbaToCss } from './store/theme';
import { I18nProvider, useI18n } from './store/i18n';
import { HomePage } from './pages/HomePage';
import { MonitorPage } from './pages/MonitorPage';
import { TabNavigation, useTabNavigation, SteamClientSwitch, LoginModal, UpdateProvider, UserStatusButton } from './components';
import { ToastContainer } from './components/ToastNotification';
import type { TabId } from './components';
import './index.css';

// Lazy-loaded pages: split into separate chunks for faster initial load
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const ForumPage = lazy(() => import('./pages/ForumPage').then(m => ({ default: m.ForumPage })));
const CheckInPage = lazy(() => import('./pages/CheckInPage').then(m => ({ default: m.CheckInPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function AppContent() {
  const { activeTab, setActiveTab } = useTabNavigation('servers');
  const theme = useTheme();
  const { t, language } = useI18n();
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  const renderPage = () => {
    switch (activeTab) {
      case 'favorites':
        return <FavoritesPage />;
      case 'forum':
        return <ForumPage />;
      case 'checkin':
        return <CheckInPage />;
      case 'settings':
        return <SettingsPage />;
      case 'servers':
      default:
        return <HomePage />;
    }
  };

  // Memoize style objects to avoid re-creating on every render
  const backgroundStyle = useMemo(() => theme.backgroundImage
    ? {
        backgroundImage: `url(${theme.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        backgroundColor: rgbaToCss(theme.colorRegions.background),
      }, [theme.backgroundImage, theme.colorRegions.background]);

  const overlayOpacity = useMemo(
    () => theme.backgroundImage ? (100 - theme.backgroundOpacity) / 100 : 0,
    [theme.backgroundImage, theme.backgroundOpacity],
  );

  // Memoize derived color strings
  const primaryColor = useMemo(() => rgbaToCss(theme.colorRegions.primary), [theme.colorRegions.primary]);
  const secondaryColor = useMemo(() => rgbaToCss(theme.colorRegions.secondary), [theme.colorRegions.secondary]);
  const headerColor = useMemo(() => rgbaToCss(theme.colorRegions.header), [theme.colorRegions.header]);

  // Memoize inline style objects to prevent re-creation
  const overlayStyle = useMemo(() => ({
    backgroundColor: rgbaToCss(theme.colorRegions.background),
    opacity: overlayOpacity,
  }), [theme.colorRegions.background, overlayOpacity]);

  const logoGradient = useMemo(
    () => ({ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }),
    [primaryColor, secondaryColor],
  );

  const titleColor = useMemo(
    () => ({ color: rgbaToCss(theme.colorRegions.text) }),
    [theme.colorRegions.text],
  );

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={backgroundStyle}
    >
      {/* Background overlay for opacity control */}
      {theme.backgroundImage && (
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          style={overlayStyle}
        />
      )}
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Global Header with Tabs */}
        <header 
          className={`sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 shadow-sm ${
            theme.glassEffect || theme.backgroundImage ? 'backdrop-blur-xl' : ''
          }`}
          style={{ backgroundColor: headerColor }}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Logo */}
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

              {/* Tab Navigation */}
              <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

              {/* User Status & Steam Client Switch - Top Right */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <UserStatusButton />
                {language === 'zh-CN' && <SteamClientSwitch t={t} />}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* MonitorPage is always mounted (hidden when inactive) so monitoring timers survive tab switches */}
          <div className={activeTab === 'monitor' ? 'flex-1 flex flex-col' : 'hidden'}>
            <MonitorPage />
          </div>
          {activeTab !== 'monitor' && (
            <Suspense fallback={<div className="flex-1" />}>
              {renderPage()}
            </Suspense>
          )}
        </main>

        {/* Login Modal */}
        <LoginModal />

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <UserProvider>
          <AppProvider>
            <UpdateProvider>
              <AppContent />
            </UpdateProvider>
          </AppProvider>
        </UserProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
