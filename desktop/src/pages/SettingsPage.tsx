import { useEffect, useSyncExternalStore } from 'react';
import { AppearanceSettingsPanel } from '@/components/settings/AppearanceSettingsPanel';
import { ColorSettingsPanel } from '@/components/settings/ColorSettingsPanel';
import { ClearDataModal } from '@/components/settings/ClearDataModal';
import { GeneralApiRefreshSection } from '@/components/settings/GeneralApiRefreshSection';
import { GeneralDataSoundSection } from '@/components/settings/GeneralDataSoundSection';
import { OperationLogPanel } from '@/components/settings/OperationLogPanel';
import { SettingsTabBar } from '@/components/settings/SettingsTabBar';
import { useSettingsPage } from '@/hooks/useSettingsPage';
import { getLogEntries, subscribeLog } from '@/services/operationLog';

export function SettingsPage() {
  const page = useSettingsPage();
  const { t, activeTab, setActiveTab, logEndRef } = page;
  const logEntries = useSyncExternalStore(subscribeLog, getLogEntries);

  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEntries, activeTab, logEndRef]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.settings}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t.settingsDesc}</p>
        </div>

        <SettingsTabBar activeTab={activeTab} setActiveTab={setActiveTab} t={t} />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              <GeneralApiRefreshSection
                t={t}
                language={page.language}
                isAuto={page.isAuto}
                setLanguage={page.setLanguage}
                apiUrl={page.apiUrl}
                setApiUrl={page.setApiUrl}
                autoRefreshInterval={page.autoRefreshInterval}
                setAutoRefreshInterval={page.setAutoRefreshInterval}
                showCustomInput={page.showCustomInput}
                setShowCustomInput={page.setShowCustomInput}
                customInputValue={page.customInputValue}
                setCustomInputValue={page.setCustomInputValue}
                getAutoRefreshOptions={page.getAutoRefreshOptions}
                prefetchPagesCount={page.prefetchPagesCount}
                setPrefetchPagesCount={page.setPrefetchPagesCount}
                prefetchDelayMs={page.prefetchDelayMs}
                setPrefetchDelayMs={page.setPrefetchDelayMs}
              />
              <GeneralDataSoundSection
                t={t}
                updateCheckStatus={page.updateCheckStatus}
                isUpdateChecking={page.isUpdateChecking}
                handleCheckForUpdates={page.handleCheckForUpdates}
                steamClient={page.steamClient}
                setSteamClientState={page.setSteamClientState}
                soundEnabled={page.soundEnabled}
                setSoundEnabled={page.setSoundEnabled}
                soundType={page.soundType}
                setSoundType={page.setSoundType}
                onClearData={() => page.setShowClearConfirm(true)}
                saved={page.saved}
                handleSave={page.handleSave}
              />
            </div>
          ) : activeTab === 'appearance' ? (
            <AppearanceSettingsPanel />
          ) : activeTab === 'colors' ? (
            <ColorSettingsPanel />
          ) : (
            <OperationLogPanel entries={logEntries} endRef={logEndRef} t={t} />
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t.appVersion}</p>
          <p className="mt-1">{t.basedOn}</p>
        </div>
      </div>

      <ClearDataModal
        open={page.showClearConfirm}
        isClearing={page.isClearing}
        t={t}
        onCancel={() => page.setShowClearConfirm(false)}
        onConfirm={page.handleClearDataAndRestart}
      />
    </div>
  );
}
