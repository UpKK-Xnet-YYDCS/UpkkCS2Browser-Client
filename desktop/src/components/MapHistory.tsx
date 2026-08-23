import { useEffect, useState } from 'react';
import { getServerMapHistory, type MapHistoryItem, type MapSessionRecord } from '@/api/history';
import { useI18n } from '@/hooks/useI18n';
import { MAP_HISTORY_PAGE_SIZE, isCurrentMapSession, mapHistoryLoadError } from '@/services/mapHistoryPresentation';
import { MapIcon } from './mapHistoryIcons';
import { MapHistoryLegacyList } from './MapHistoryLegacyList';
import { MapHistoryPagination } from './MapHistoryPagination';
import { MapHistorySessionList } from './MapHistorySessionList';
import { MapSessionModal } from './MapSessionModal';

interface MapHistoryProps {
  serverAddress: string; // e.g. "cs2ze.upkk.com:27015"
}

export function MapHistory({ serverAddress }: MapHistoryProps) {
  const [history, setHistory] = useState<MapHistoryItem[]>([]);
  const [sessions, setSessions] = useState<MapSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<MapSessionRecord | null>(null);
  const [selectedSessionIsCurrentMap, setSelectedSessionIsCurrentMap] = useState(false);
  const { t, language } = useI18n();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        // Changed to 5 per page as requested
        const response = await getServerMapHistory(serverAddress, page, MAP_HISTORY_PAGE_SIZE);
        setHistory(response.history || []);
        setSessions(response.sessions || []);
        setTotalPages(response.total_pages || 1);
      } catch (err) {
        setError(mapHistoryLoadError(err, t.loadMapHistoryFailed));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [serverAddress, page, t.loadMapHistoryFailed]);

  const handleSessionClick = (session: MapSessionRecord, index: number) => {
    // First item on first page is the current map
    setSelectedSession(session);
    setSelectedSessionIsCurrentMap(isCurrentMapSession(page, index));
  };

  const pagination = (
    <MapHistoryPagination
      page={page}
      totalPages={totalPages}
      prevLabel={t.prevPage}
      nextLabel={t.nextPage}
      onPageChange={setPage}
    />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-500 dark:text-gray-400">{t.loadMapHistory}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <p>{error}</p>
      </div>
    );
  }

  // Prefer sessions data if available (includes player history for chart)
  if (sessions.length > 0) {
    return (
      <div>
        <MapHistorySessionList
          sessions={sessions}
          page={page}
          language={language}
          units={t}
          onSessionClick={handleSessionClick}
        />
        {pagination}
        {selectedSession && (
          <MapSessionModal
            session={selectedSession}
            isCurrentMap={selectedSessionIsCurrentMap}
            onClose={() => setSelectedSession(null)}
          />
        )}
      </div>
    );
  }

  // Fallback to legacy history format (without sessions)
  if (history.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <MapIcon />
        <p className="mt-2">暂无地图历史记录</p>
      </div>
    );
  }

  return (
    <div>
      <MapHistoryLegacyList history={history} language={language} units={t} />
      {pagination}
    </div>
  );
}
