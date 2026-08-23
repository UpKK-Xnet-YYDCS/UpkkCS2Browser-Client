import type { MonitorNotifySettings } from '@/services/monitor';
import type { Translations } from '@/store/i18n';
import { MonitorNotifyChannels } from './MonitorNotifyChannels';
import { MonitorNotifyTemplateField } from './MonitorNotifyTemplateField';

export interface MonitorNotifyPanelProps {
  t: Translations;
  notifySettings: MonitorNotifySettings;
  updateNotifySettings: (update: Partial<MonitorNotifySettings>) => void;
  desktopTestResult: string | null;
  discordTestResult: string | null;
  serverChanTestResult: string | null;
  customWebhookTestResult: string | null;
  handleTestDesktop: () => void;
  handleTestWebhook: () => void;
  handleTestServerChan: () => void;
  handleTestCustomWebhook: () => void;
}

export function MonitorNotifyPanel(props: MonitorNotifyPanelProps) {
  const { t, notifySettings, updateNotifySettings } = props;
  return (
    <>
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t.monitorNotifyChannels}
            </label>
            <MonitorNotifyChannels {...props} />

            <MonitorNotifyTemplateField
              t={t}
              kind="title"
              value={notifySettings.alertTitle}
              onChange={alertTitle => updateNotifySettings({ alertTitle })}
            />
            <MonitorNotifyTemplateField
              t={t}
              kind="message"
              value={notifySettings.customMessageTemplate}
              onChange={customMessageTemplate => updateNotifySettings({ customMessageTemplate })}
            />
          </div>
    </>
  );
}
