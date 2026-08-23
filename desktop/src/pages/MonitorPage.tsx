import { lazy, Suspense } from 'react';
import { MonitorControlPanel } from '@/components/monitor/MonitorControlPanel';
import { MonitorFab } from '@/components/monitor/MonitorFab';
import { BellIcon } from '@/components/monitor/MonitorIcons';
import { MonitorLoginSuggestion } from '@/components/monitor/MonitorLoginSuggestion';
import { MonitorMatchedServers } from '@/components/monitor/MonitorMatchedServers';
import { MonitorMonitoredServers } from '@/components/monitor/MonitorMonitoredServers';
import { MonitorRuleList } from '@/components/monitor/MonitorRuleList';
import { MonitorStartPrompt } from '@/components/monitor/MonitorStartPrompt';
import { RuleEditor } from '@/components/monitor/RuleEditor';
import { useI18n } from '@/hooks/useI18n';
import { useMonitorPage } from '@/hooks/useMonitorPage';
import { useTheme } from '@/hooks/useTheme';
import { createDefaultRule } from '@/services/monitor';
import { matchedServerToStatus } from '@/services/monitorPresentation';
import { rgbaToCss } from '@/store/themeUtils';

const JoinServerConfirmModal = lazy(() => import('@/components/JoinServerConfirmModal').then(module => ({ default: module.JoinServerConfirmModal })));

export function MonitorPage() {
  const theme = useTheme();
  const { t } = useI18n();
  const page = useMonitorPage();
  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const secondaryColor = rgbaToCss(theme.colorRegions.secondary);
  const enabledRuleCount = page.rules.filter(rule => rule.enabled).length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, ' + primaryColor + ' 0%, ' + secondaryColor + ' 100%)' }}
            >
              <BellIcon />
            </div>
            {t.monitorTitle}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">{t.monitorDesc}</p>
        </div>

        {!page.isLoggedIn && !page.loginSuggestionDismissed && (
          <MonitorLoginSuggestion
            t={t}
            loginPending={page.loginPending}
            onLogin={page.handleProviderLogin}
            onDismiss={() => page.setLoginSuggestionDismissed(true)}
          />
        )}

        <MonitorRuleList
          t={t}
          rules={page.rules}
          onToggle={page.handleToggleRule}
          onEdit={(rule) => page.setEditingRule(rule)}
          onDelete={page.handleDeleteRule}
          onCreate={() => page.setEditingRule(createDefaultRule())}
        />
        <MonitorMatchedServers
          t={t}
          currentMatches={page.currentMatches}
          recentMatches={page.status.matchedServers}
          onJoin={(match) => page.setJoinTarget(matchedServerToStatus(match))}
        />
        <MonitorControlPanel
          t={t}
          isEnabled={page.isEnabled}
          enabledRuleCount={enabledRuleCount}
          checkCount={page.status.checkCount}
          matchCount={page.status.matchedServers.length}
          lastCheckLabel={page.formatTime(page.status.lastCheckTime)}
          lastError={page.status.lastError}
          interval={page.interval}
          notifySettings={page.notifySettings}
          desktopTestResult={page.desktopTestResult}
          discordTestResult={page.discordTestResult}
          serverChanTestResult={page.serverChanTestResult}
          customWebhookTestResult={page.customWebhookTestResult}
          onToggle={page.toggleMonitor}
          onIntervalChange={page.handleIntervalChange}
          updateNotifySettings={page.updateNotifySettings}
          handleTestDesktop={page.handleTestDesktop}
          handleTestWebhook={page.handleTestWebhook}
          handleTestServerChan={page.handleTestServerChan}
          handleTestCustomWebhook={page.handleTestCustomWebhook}
        />
        <MonitorMonitoredServers
          t={t}
          allMonitoredServers={page.allMonitoredServers}
          monitoredServerInfo={page.monitoredServerInfo}
          removeServerFromAllRules={page.removeServerFromAllRules}
        />
      </div>

      {page.editingRule && (
        <RuleEditor
          rule={page.editingRule}
          onSave={page.handleSaveRule}
          onCancel={() => page.setEditingRule(null)}
          t={t}
        />
      )}

      {page.showStartPrompt && (
        <MonitorStartPrompt
          t={t}
          isEnabled={page.isEnabled}
          onLater={() => page.setShowStartPrompt(false)}
          onConfirm={page.handleStartMonitorFromPrompt}
        />
      )}

      {page.joinTarget && (
        <Suspense fallback={null}>
          <JoinServerConfirmModal server={page.joinTarget} onClose={() => page.setJoinTarget(null)} />
        </Suspense>
      )}

      <MonitorFab
        t={t}
        isEnabled={page.isEnabled}
        disabled={enabledRuleCount === 0}
        onToggle={page.toggleMonitor}
      />
    </div>
  );
}
