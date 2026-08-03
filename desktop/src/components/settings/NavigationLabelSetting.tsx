import { useI18n } from '@/hooks/useI18n';
import { useNavigationLabelMode } from '@/hooks/useNavigationLabelMode';
import { navigationLabelText } from './navigationLabelText';

export function NavigationLabelSetting() {
  const { language } = useI18n();
  const { mode, setMode } = useNavigationLabelMode();
  const showLabels = mode === 'labels';
  const text = navigationLabelText[language];

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{text.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{text.description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={showLabels}
        aria-label={text.title}
        onClick={() => setMode(showLabels ? 'icons' : 'labels')}
        className={`relative h-7 w-14 shrink-0 rounded-full transition-colors ${showLabels ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${showLabels ? 'translate-x-8' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
