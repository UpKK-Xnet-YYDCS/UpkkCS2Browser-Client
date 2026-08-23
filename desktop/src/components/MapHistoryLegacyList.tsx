import type { MapHistoryItem } from '@/api/history';
import { formatDuration, formatTime, getTimestamp } from '@/services/mapHistoryFormat';
import { ClockIcon, MapIcon } from './mapHistoryIcons';

interface MapHistoryLegacyListProps {
  history: MapHistoryItem[];
  language: string;
  units: { minutesUnit: string; hoursUnit: string };
}

export function MapHistoryLegacyList({ history, language, units }: MapHistoryLegacyListProps) {
  return (
    <div className="space-y-2">
      {history.map((item, index) => (
        <div
          key={item.map_name + '-' + getTimestamp(item) + '-' + String(index)}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
              <MapIcon />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {item.map_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <ClockIcon />
                {formatTime(getTimestamp(item), language)}
              </p>
            </div>
          </div>
          {item.duration_seconds !== undefined && item.duration_seconds > 0 && (
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
              {formatDuration(item.duration_seconds, units)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
