import { useState, useEffect, useRef } from 'react';
import { getServerPlayerHistory, type PlayerHistoryStat } from '@/api';
import { useI18n } from '@/store/i18n';

interface PlayerHistoryChartProps {
  serverId: string;
}

type Period = '6h' | '12h' | '24h' | '7d' | '30d';

// ChartIcon
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

export function PlayerHistoryChart({ serverId }: PlayerHistoryChartProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<PlayerHistoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('24h');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Get periods with translations
  const PERIODS: { value: Period; label: string }[] = [
    { value: '6h', label: t.period6h },
    { value: '12h', label: t.period12h },
    { value: '24h', label: t.period24h },
    { value: '7d', label: t.period7d },
    { value: '30d', label: t.period30d },
  ];

  useEffect(() => {
    loadData();
  }, [serverId, period]);

  useEffect(() => {
    if (stats.length > 0) {
      drawChart();
    }
  }, [stats]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getServerPlayerHistory(serverId, period);
      setStats(response.stats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || stats.length === 0) return;

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
    const realPlayers = stats.map(s => s.real_players ?? s.players ?? 0);
    const bots = stats.map(s => s.bots ?? 0);
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

    // Draw X-axis labels (show a few time labels)
    const labelCount = Math.min(6, stats.length);
    const labelStep = Math.floor(stats.length / labelCount) || 1;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < stats.length; i += labelStep) {
      const x = padding.left + (chartWidth / (stats.length - 1 || 1)) * i;
      const date = new Date(stats[i].timestamp);
      const label = period === '7d' || period === '30d'
        ? date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(label, x, height - 8);
    }

    // Draw real players line
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
    if (bots.some(b => b > 0)) {
      drawLine(bots, '#f59e0b', 'rgba(245, 158, 11, 0.15)');
    }
    // Draw real players
    drawLine(realPlayers, '#3b82f6', 'rgba(59, 130, 246, 0.2)');
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChartIcon />
          <h3 className="font-semibold text-gray-900 dark:text-white">{t.playerHistory}</h3>
        </div>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === p.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="h-40 flex items-center justify-center text-red-500 text-sm">
          {error}
        </div>
      ) : stats.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
          {t.noHistoryData}
        </div>
      ) : (
        <>
          <div className="h-40">
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
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span className="text-gray-600 dark:text-gray-400">{t.bots}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
