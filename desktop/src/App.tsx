import { useCallback, lazy, Suspense } from 'react';
import { AppProvider } from './store';
import { UserProvider } from './store/user';
import { CloudAuthProvider } from './store/cloudAuth';
import { ThemeProvider } from './store/theme';
import { I18nProvider } from './store/i18nProvider';
import { AppLayout } from './components/app/AppLayout';
import { UpdateProvider } from './components/UpdateProvider';
import { useTabNavigation, type TabId } from './hooks/useTabNavigation';
import { useUserStore } from './hooks/useUserStore';
import { MonitorRuntimeProvider } from './store/monitorRuntime';
import { HomePage } from './pages/HomePage';
import './index.css';

const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const AIChatPage = lazy(() => import('./pages/AIChatPage').then(m => ({ default: m.AIChatPage })));
const ForumPage = lazy(() => import('./pages/ForumPage').then(m => ({ default: m.ForumPage })));
const CheckInPage = lazy(() => import('./pages/CheckInPage').then(m => ({ default: m.CheckInPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const MonitorPage = lazy(() => import('./pages/MonitorPage').then(m => ({ default: m.MonitorPage })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));

function renderPage(activeTab: TabId) {
  switch (activeTab) {
    case 'ai':
      return <AIChatPage />;
    case 'favorites':
      return <FavoritesPage />;
    case 'forum':
      return <ForumPage />;
    case 'checkin':
      return <CheckInPage />;
    case 'settings':
      return <SettingsPage />;
    case 'monitor':
      return <MonitorPage />;
    case 'servers':
    default:
      return <HomePage />;
  }
}

function AppContent() {
  const { activeTab, setActiveTab } = useTabNavigation('servers');
  const { showLoginModal } = useUserStore();
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      loginModal={showLoginModal ? (
        <Suspense fallback={null}>
          <LoginModal />
        </Suspense>
      ) : null}
    >
      {renderPage(activeTab)}
    </AppLayout>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <UserProvider>
          <CloudAuthProvider>
            <AppProvider>
              <MonitorRuntimeProvider>
                <UpdateProvider>
                  <AppContent />
                </UpdateProvider>
              </MonitorRuntimeProvider>
            </AppProvider>
          </CloudAuthProvider>
        </UserProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
