import { A2STestSection } from '@/components/settings/A2STestSection';
import { ClearDataSection } from '@/components/settings/ClearDataSection';
import { NotificationSoundSection } from '@/components/settings/NotificationSoundSection';
import { SettingsSaveButton } from '@/components/settings/SettingsSaveButton';
import { SteamClientSettingsSection } from '@/components/settings/SteamClientSettingsSection';
import { UpdateCheckSection } from '@/components/settings/UpdateCheckSection';
import type { SettingsUpdateCheckStatus } from '@/services/settingsUpdateCheck';
import type { SteamClient } from '@/services/steamClient';
import type { NotificationSound } from '@/services/toast';
import type { Translations } from '@/store/i18n';

export interface GeneralDataSoundSectionProps {
  t: Translations;
  updateCheckStatus: SettingsUpdateCheckStatus;
  isUpdateChecking: boolean;
  handleCheckForUpdates: () => void;
  steamClient: SteamClient;
  setSteamClientState: (value: SteamClient) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  soundType: NotificationSound;
  setSoundType: (value: NotificationSound) => void;
  onClearData: () => void;
  saved: boolean;
  handleSave: () => void;
}

export function GeneralDataSoundSection(props: GeneralDataSoundSectionProps) {
  return (
    <>
      <UpdateCheckSection
        t={props.t}
        updateCheckStatus={props.updateCheckStatus}
        isUpdateChecking={props.isUpdateChecking}
        handleCheckForUpdates={props.handleCheckForUpdates}
      />
      <ClearDataSection t={props.t} onClearData={props.onClearData} />
      <A2STestSection />
      <NotificationSoundSection
        t={props.t}
        soundEnabled={props.soundEnabled}
        setSoundEnabled={props.setSoundEnabled}
        soundType={props.soundType}
        setSoundType={props.setSoundType}
      />
      <SteamClientSettingsSection
        t={props.t}
        steamClient={props.steamClient}
        setSteamClientState={props.setSteamClientState}
      />
      <SettingsSaveButton t={props.t} saved={props.saved} handleSave={props.handleSave} />
    </>
  );
}
