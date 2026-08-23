import { RGBAColorPicker } from '@/components/RGBAColorPicker';
import { PaletteIcon } from '@/components/settings/SettingsIcons';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import type { ColorRegion } from '@/store/theme';

const colorRegionOrder: ColorRegion[] = ['primary', 'secondary', 'accent', 'header', 'sidebar', 'background', 'text'];

export function ColorSettingsPanel() {
  const theme = useTheme();
  const { t } = useI18n();
  const getColorRegionLabel = (region: ColorRegion): string => {
    const labels: Record<ColorRegion, string> = {
      primary: t.primaryColor,
      secondary: t.secondaryColor,
      accent: t.accentColor,
      header: t.headerColor,
      sidebar: t.sidebarColor,
      background: t.backgroundColor,
      text: t.textColor,
    };
    return labels[region];
  };

  return (
            <div className="space-y-4">
              {/* Colors Tab - RGBA Color Pickers for each region */}
              <div className="flex items-center gap-2 mb-6">
                <PaletteIcon />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t.multiRegionPalette}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.multiRegionPaletteDesc}</p>
                </div>
              </div>

              {colorRegionOrder.map((region) => (
                <RGBAColorPicker
                  key={region}
                  label={getColorRegionLabel(region)}
                  color={theme.colorRegions[region]}
                  onChange={(color) => theme.setColorRegion(region, color)}
                  onReset={() => theme.resetColorRegion(region)}
                />
              ))}

              {/* Reset All Colors */}
              <button
                onClick={theme.resetTheme}
                className="w-full py-3 mt-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                {t.resetAllColors}
              </button>
            </div>

  );
}
