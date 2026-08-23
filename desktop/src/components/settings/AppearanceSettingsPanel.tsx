import { useRef } from 'react';
import { NavigationLabelSetting } from '@/components/settings/NavigationLabelSetting';
import { ImageIcon, MoonIcon, SunIcon } from '@/components/settings/SettingsIcons';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';

export function AppearanceSettingsPanel() {
  const theme = useTheme();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        theme.setBackgroundImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearBackground = () => {
    theme.setBackgroundImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {theme.darkMode ? <MoonIcon /> : <SunIcon />}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.darkMode}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.darkModeDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => theme.setDarkMode(!theme.darkMode)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    theme.darkMode ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      theme.darkMode ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <NavigationLabelSetting />
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{t.glassEffect}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.glassEffectDesc}</p>
                </div>
                <button
                  onClick={() => theme.setGlassEffect(!theme.glassEffect)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    theme.glassEffect ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      theme.glassEffect ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t.backgroundImage}
                </label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <ImageIcon />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {theme.backgroundImage ? t.changeImage : t.selectImage}
                    </span>
                  </button>
                  {theme.backgroundImage && (
                    <button
                      onClick={handleClearBackground}
                      className="px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      {t.clearBackground}
                    </button>
                  )}
                </div>
                {theme.backgroundImage && (
                  <div className="mt-3 h-32 rounded-xl overflow-hidden">
                    <img
                      src={theme.backgroundImage}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Background Opacity */}
              {theme.backgroundImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t.backgroundOpacity}: {theme.backgroundOpacity}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={theme.backgroundOpacity}
                    onChange={(e) => theme.setBackgroundOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              )}

              {/* Reset Theme */}
              <button
                onClick={theme.resetTheme}
                className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                {t.resetAppearance}
              </button>
            </div>

  );
}
