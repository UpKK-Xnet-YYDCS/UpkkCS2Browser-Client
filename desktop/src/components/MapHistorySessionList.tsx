import type { MapSessionRecord } from '@/api/history';
import { formatDuration, formatTime } from '@/services/mapHistoryFormat';
import {
  isCurrentMapSession,
  mapSessionDurationClass,
  mapSessionIconClass,
  mapSessionRowClass,
} from '@/services/mapHistoryPresentation';
import { ChartIcon, ClockIcon, MapIcon } from './mapHistoryIcons';

interface MapHistorySessionListProps {
  sessions: MapSessionRecord[];
  page: number;
  language: string;
  units: { minutesUnit: string; hoursUnit: string };
  onSessionClick: (session: MapSessionRecord, index: number) => void;
}

export function MapHistorySessionList({
  sessions,
  page,
  language,
  units,
  onSessionClick,
}: MapHistorySessionListProps) {
  return (
    <div className="space-y-2">
      {sessions.map((session, index) => {
        const isCurrentMap = isCurrentMapSession(page, index);
        return (
          <div
            key={session.map_name + '-' + session.start_time + '-' + String(index)}
            onClick={() => onSessionClick(session, index)}
            className={mapSessionRowClass(isCurrentMap)}
          >
            <div className="flex items-center gap-3">
              <div className={mapSessionIconClass(isCurrentMap)}>
                <MapIcon />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1">
                  {session.map_name}
                  {isCurrentMap && (
                    <span className="text-xs text-green-600 dark:text-green-400 animate-pulse">● 当前</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <ClockIcon />
                  {formatTime(session.start_time, language)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                👥 {session.avg_players.toFixed(1)}
              </span>
              <span className={mapSessionDurationClass(isCurrentMap)}>
                {formatDuration(session.duration_secs, units)}
              </span>
              <ChartIcon />
            </div>
          </div>
        );
      })}
    </div>
  );
}
