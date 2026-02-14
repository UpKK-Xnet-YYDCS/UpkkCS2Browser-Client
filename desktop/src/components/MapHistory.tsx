import { useState, useEffect, useRef } from 'react';
import { getServerMapHistory, type MapHistoryItem, type MapSessionRecord } from '@/api';
import { useI18n, type Translations } from '@/store/i18n';

interface MapHistoryProps {
  serverAddress: string; // e.g. "cs2ze.upkk.com:27015"
}

const MapIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

function formatDuration(seconds: number, t: Translations): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t.minutesUnit}`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours} ${t.hoursUnit}${mins > 0 ? ` ${mins} ${t.minutesUnit}` : ''}`;
}

function formatTime(timestamp: string, language: string): string {
  // Handle various date formats from the API
  if (!timestamp) return '';
  
  // Try to parse the timestamp
  const date = new Date(timestamp);
  
  // Map language to locale
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'ja': 'ja-JP',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'ko': 'ko-KR',
  };
  const locale = localeMap[language] || 'en-US';
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    // Try parsing as Unix timestamp (seconds)
    const unixTimestamp = parseInt(timestamp, 10);
    if (!isNaN(unixTimestamp)) {
      const unixDate = new Date(unixTimestamp * 1000);
      if (!isNaN(unixDate.getTime())) {
        return unixDate.toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    return '';
  }
  
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get timestamp from item (API may use "timestamp" or "started_at")
function getTimestamp(item: MapHistoryItem): string {
  return item.timestamp || item.started_at || '';
}

// Map Session Detail Modal Component
function MapSessionModal({ 
  session, 
  isCurrentMap, 
  onClose 
}: { 
  session: MapSessionRecord; 
  isCurrentMap: boolean; 
  onClose: () => void 
}) {
  const { t, language } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawChart();
  }, [session]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !session.player_history || session.player_history.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get data
    const realPlayers = session.player_history;
    const bots = session.bot_history || [];
    const maxValue = Math.max(...realPlayers, ...bots, 1);

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = Math.round(maxValue - (maxValue / gridLines) * i);
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(value), padding.left - 5, y + 4);
    }

    // Draw X-axis labels
    const startTime = new Date(session.start_time);
    const totalDuration = session.duration_secs;
    const dataPoints = realPlayers.length;
    const intervalSecs = dataPoints > 1 ? totalDuration / (dataPoints - 1) : totalDuration;
    
    const labelCount = Math.min(6, realPlayers.length);
    const labelStep = Math.floor(realPlayers.length / labelCount) || 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < realPlayers.length; i += labelStep) {
      const x = padding.left + (chartWidth / (realPlayers.length - 1 || 1)) * i;
      const pointTime = new Date(startTime.getTime() + i * intervalSecs * 1000);
      const label = pointTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(label, x, height - 8);
    }

    // Draw line helper
    const drawLine = (data: number[], color: string, fillColor: string) => {
      if (data.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const xStep = chartWidth / (data.length - 1 || 1);
      
      for (let i = 0; i < data.length; i++) {
        const x = padding.left + xStep * i;
        const y = padding.top + chartHeight - (data[i] / maxValue) * chartHeight;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Fill area under the line
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    };

    // Draw bots first (behind)
    if (bots.length > 0 && bots.some(b => b > 0)) {
      drawLine(bots, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
    }
    // Draw real players
    drawLine(realPlayers, '#3b82f6', 'rgba(59, 130, 246, 0.2)');
  };

  // Map language to locale
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'ja': 'ja-JP',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'ko': 'ko-KR',
  };
  const locale = localeMap[language] || 'en-US';

  const startTime = new Date(session.start_time);
  const endTime = new Date(session.end_time);
  const startStr = startTime.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const endStr = isCurrentMap ? `${t.serverRunning}...` : endTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapIcon />
            <h3 className="font-bold">{session.map_name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Duration Stats */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">⏱️ {t.runtime}</div>
            <div className={`font-bold text-lg ${isCurrentMap ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
              {formatDuration(session.duration_secs, t)}
              {isCurrentMap && <span className="ml-2 text-xs animate-pulse">● {t.serverRunning}</span>}
            </div>
          </div>

          {/* Player Chart */}
          {session.player_history && session.player_history.length > 0 ? (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartIcon />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.playerCountCurve}</span>
              </div>
              <div className="h-40 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  style={{ display: 'block' }}
                />
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">{t.realPlayers}</span>
                </div>
                {session.bot_history && session.bot_history.some(b => b > 0) && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-amber-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">{t.bots}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              {t.noPlayerCurveData}
            </div>
          )}

          {/* Time Range */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            {startStr} ~ {endStr}
          </div>
        </div>
      </div>
    </div>
  );
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
        const response = await getServerMapHistory(serverAddress, page, 5);
        setHistory(response.history || []);
        setSessions(response.sessions || []);
        setTotalPages(response.total_pages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.loadMapHistoryFailed);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [serverAddress, page, t.loadMapHistoryFailed]);

  const handleSessionClick = (session: MapSessionRecord, index: number) => {
    // First item on first page is the current map
    const isCurrentMap = page === 1 && index === 0;
    setSelectedSession(session);
    setSelectedSessionIsCurrentMap(isCurrentMap);
  };

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
        {/* Sessions List with click to view chart */}
        <div className="space-y-2">
          {sessions.map((session, index) => {
            const isCurrentMap = page === 1 && index === 0;
            return (
              <div
                key={`${session.map_name}-${session.start_time}-${index}`}
                onClick={() => handleSessionClick(session, index)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  isCurrentMap 
                    ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                    isCurrentMap 
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
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
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isCurrentMap 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    {formatDuration(session.duration_secs, t)}
                  </span>
                  <ChartIcon />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t.prevPage}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t.nextPage}
            </button>
          </div>
        )}

        {/* Session Detail Modal */}
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
      {/* History List (legacy format) */}
      <div className="space-y-2">
        {history.map((item, index) => (
          <div
            key={`${item.map_name}-${getTimestamp(item)}-${index}`}
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
                {formatDuration(item.duration_seconds, t)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t.prevPage}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t.nextPage}
          </button>
        </div>
      )}
    </div>
  );
}
