import {
  playNotificationSound,
  setNotificationSound,
  setNotificationSoundEnabled,
  type NotificationSound,
} from '@/services/toast';
import type { Translations } from '@/store/i18n';

const SOUND_OPTIONS: NotificationSound[] = ['chime', 'bubble', 'bell'];

export function NotificationSoundSection({
  t,
  soundEnabled,
  setSoundEnabled,
  soundType,
  setSoundType,
}: {
  t: Translations;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  soundType: NotificationSound;
  setSoundType: (value: NotificationSound) => void;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  {t.notificationSound}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.notificationSoundEnabled}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.notificationSoundEnabledDesc}</p>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !soundEnabled;
                        setSoundEnabled(newVal);
                        setNotificationSoundEnabled(newVal);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        soundEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                        soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {soundEnabled && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.notificationSoundType}</p>
                      <div className="flex gap-2 flex-wrap">
                        {SOUND_OPTIONS.map(sound => (
                          <button
                            key={sound}
                            onClick={() => {
                              setSoundType(sound);
                              setNotificationSound(sound);
                              playNotificationSound(sound);
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                              soundType === sound
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                            }`}
                          >
                            <span>{sound === 'chime' ? '🔔' : sound === 'bubble' ? '💧' : '🔊'}</span>
                            {t[`soundType_${sound}` as keyof typeof t]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
  );
}
