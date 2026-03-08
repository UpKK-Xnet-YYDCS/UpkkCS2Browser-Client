import { useCallback } from 'react';
import { AppProvider } from './store';
import { UserProvider } from './store/user';
import { ThemeProvider, useTheme, rgbaToCss } from './store/theme';
import { I18nProvider, useI18n } from './store/i18n';
import { HomePage, FavoritesPage, ForumPage, CheckInPage, SettingsPage, MonitorPage } from './pages';
import { TabNavigation, useTabNavigation, SteamClientSwitch, LoginModal, UpdateProvider, UserStatusButton } from './components';
import { ToastContainer } from './components/ToastNotification';
import type { TabId } from './components';
import './index.css';

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

  // Background style based on theme settings
  const backgroundStyle = theme.backgroundImage
    ? {
        backgroundImage: `url(${theme.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        backgroundColor: rgbaToCss(theme.colorRegions.background),
      };

  const overlayOpacity = theme.backgroundImage ? (100 - theme.backgroundOpacity) / 100 : 0;

  // Get colors from theme
  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const secondaryColor = rgbaToCss(theme.colorRegions.secondary);
  const headerColor = rgbaToCss(theme.colorRegions.header);

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={backgroundStyle}
    >
      {/* Background overlay for opacity control */}
      {theme.backgroundImage && (
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          style={{ 
            backgroundColor: rgbaToCss(theme.colorRegions.background),
            opacity: overlayOpacity 
          }}
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
                  style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
                >
                  <span className="text-white font-bold text-lg">U</span>
                </div>
                <div className="hidden sm:block">
                  <h1 
                    className="text-lg font-bold"
                    style={{ color: rgbaToCss(theme.colorRegions.text) }}
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
          {activeTab !== 'monitor' && renderPage()}
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
