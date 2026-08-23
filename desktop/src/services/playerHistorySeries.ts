export type PlayerHistoryPeriod = '6h' | '12h' | '24h' | '7d' | '30d';

export interface PlayerHistoryPointLike {
  timestamp?: string;
  real_players?: number;
  players?: number;
  bots?: number;
}

export function playerHistorySeries(stats: readonly PlayerHistoryPointLike[]): {
  realPlayers: number[];
  bots: number[];
  maxValue: number;
} {
  const realPlayers = stats.map((stat) => stat.real_players ?? stat.players ?? 0);
  const bots = stats.map((stat) => stat.bots ?? 0);
  return {
    realPlayers,
    bots,
    maxValue: Math.max(...realPlayers, ...bots, 1),
  };
}

export function playerHistoryHoverCounts(point: PlayerHistoryPointLike): {
  realPlayers: number;
  bots: number;
} {
  return {
    realPlayers: point.real_players ?? point.players ?? 0,
    bots: point.bots ?? 0,
  };
}

export function isPlayerHistoryDatePeriod(period: string): boolean {
  return period === '7d' || period === '30d';
}

export function formatPlayerHistoryXAxisLabel(timestamp: string, period: string): string {
  const date = new Date(timestamp);
  return isPlayerHistoryDatePeriod(period)
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
