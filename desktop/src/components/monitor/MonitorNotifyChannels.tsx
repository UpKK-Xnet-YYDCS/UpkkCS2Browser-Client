import {
  CustomWebhookIcon,
  DesktopIcon,
  DiscordIcon,
  ServerChanIcon,
  TestIcon,
} from '@/components/monitor/MonitorIcons';
import type { MonitorNotifySettings } from '@/services/monitor';
import {
  notifyDesktopTestButtonClass,
  notifyTestLabel,
  notifyChannelInputClass,
} from '@/services/monitorNotifyUi';
import type { Translations } from '@/store/i18n';
import { MonitorNotifyToggle } from './MonitorNotifyToggle';
import {
  MonitorNotifyChannelCard,
  MonitorNotifyChannelTitle,
  MonitorNotifyTestButton,
} from './MonitorNotifyChannelParts';

export interface MonitorNotifyChannelsProps {
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

const WEBHOOK_PAYLOAD = [
  'POST Content-Type: application/json',
  '{',
  '  "event": "map_alert",',
  '  "server_name": "string",',
  '  "map_name": "string",',
  '  "players": number,',
  '  "max_players": number,',
  '  "address": "ip:port",',
  '  "rule_name": "string",',
  '  "matched_pattern": "string",',
  '  "timestamp": "ISO 8601",',
  '  "message": "string (formatted)"',
  '}',
].join('\n');

export function MonitorNotifyChannels(props: MonitorNotifyChannelsProps) {
  const {
    t, notifySettings, updateNotifySettings,
    desktopTestResult, discordTestResult, serverChanTestResult, customWebhookTestResult,
    handleTestDesktop, handleTestWebhook, handleTestServerChan, handleTestCustomWebhook,
  } = props;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <MonitorNotifyChannelTitle
          icon={<DesktopIcon />}
          title={t.monitorDesktopNotify}
          description={t.monitorDesktopNotifyDesc}
        />
        <div className="flex items-center gap-2">
          {notifySettings.notifyDesktop && (
            <button
              onClick={handleTestDesktop}
              disabled={desktopTestResult === 'testing'}
              className={notifyDesktopTestButtonClass(desktopTestResult)}
            >
              <TestIcon />
              {notifyTestLabel(desktopTestResult, {
                testing: t.monitorTesting,
                success: t.monitorTestSuccess,
                failed: t.monitorTestFailed,
                idle: t.monitorTest,
              })}
            </button>
          )}
          <MonitorNotifyToggle
            enabled={notifySettings.notifyDesktop}
            enabledClass="bg-blue-500"
            onToggle={() => updateNotifySettings({ notifyDesktop: !notifySettings.notifyDesktop })}
          />
        </div>
      </div>

      <MonitorNotifyChannelCard
        icon={<DiscordIcon />}
        title={t.monitorDiscordNotify}
        description={t.monitorDiscordNotifyDesc}
        enabled={notifySettings.notifyDiscord}
        enabledClass="bg-[#5865F2]"
        onToggle={() => updateNotifySettings({ notifyDiscord: !notifySettings.notifyDiscord })}
      >
        {notifySettings.notifyDiscord && (
          <div className="space-y-2">
            <input
              type="url"
              value={notifySettings.discordWebhookUrl}
              onChange={e => updateNotifySettings({ discordWebhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className={notifyChannelInputClass('focus:ring-[#5865F2]/20 focus:border-[#5865F2]')}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.monitorDiscordHelp}
            </div>
            {notifySettings.discordWebhookUrl && (
              <MonitorNotifyTestButton
                result={discordTestResult}
                idleClass="bg-[#5865F2] text-white hover:bg-[#4752C4]"
                idleLabel={t.monitorTestWebhook}
                onClick={handleTestWebhook}
                t={t}
              />
            )}
          </div>
        )}
      </MonitorNotifyChannelCard>

      <MonitorNotifyChannelCard
        icon={<ServerChanIcon />}
        title={t.monitorServerChanNotify}
        description={t.monitorServerChanNotifyDesc}
        enabled={notifySettings.notifyServerChan}
        enabledClass="bg-green-500"
        onToggle={() => updateNotifySettings({ notifyServerChan: !notifySettings.notifyServerChan })}
      >
        {notifySettings.notifyServerChan && (
          <div className="space-y-2">
            <input
              type="text"
              value={notifySettings.serverChanKey}
              onChange={e => updateNotifySettings({ serverChanKey: e.target.value })}
              placeholder="SCT..."
              className={notifyChannelInputClass('focus:ring-green-500/20 focus:border-green-500')}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.monitorServerChanHelp}
            </div>
            {notifySettings.serverChanKey && (
              <MonitorNotifyTestButton
                result={serverChanTestResult}
                idleClass="bg-green-500 text-white hover:bg-green-600"
                idleLabel={t.monitorTest}
                onClick={handleTestServerChan}
                t={t}
              />
            )}
          </div>
        )}
      </MonitorNotifyChannelCard>

      <MonitorNotifyChannelCard
        icon={<CustomWebhookIcon />}
        title={t.monitorCustomWebhookNotify}
        description={t.monitorCustomWebhookNotifyDesc}
        enabled={notifySettings.notifyCustomWebhook}
        enabledClass="bg-purple-500"
        onToggle={() => updateNotifySettings({ notifyCustomWebhook: !notifySettings.notifyCustomWebhook })}
      >
        {notifySettings.notifyCustomWebhook && (
          <div className="space-y-2">
            <input
              type="url"
              value={notifySettings.customWebhookUrl}
              onChange={e => updateNotifySettings({ customWebhookUrl: e.target.value })}
              placeholder="https://your-bot-server.com/webhook"
              className={notifyChannelInputClass('focus:ring-purple-500/20 focus:border-purple-500')}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t.monitorCustomWebhookHelp}
            </div>
            <details className="text-xs text-gray-500 dark:text-gray-400">
              <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none">
                {t.monitorCustomWebhookFieldsTitle}
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed whitespace-pre">
{WEBHOOK_PAYLOAD}
              </pre>
            </details>
            {notifySettings.customWebhookUrl && (
              <MonitorNotifyTestButton
                result={customWebhookTestResult}
                idleClass="bg-purple-500 text-white hover:bg-purple-600"
                idleLabel={t.monitorTestWebhook}
                onClick={handleTestCustomWebhook}
                t={t}
              />
            )}
          </div>
        )}
      </MonitorNotifyChannelCard>
    </div>
  );
}
