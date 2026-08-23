import type { RecommendedServer } from './aiChat.ts';
import type { A2SQueryResult } from './a2s.ts';
import type { ServerStatus } from '@/types';
import type { LocalLatencyResult } from './desktopToolTypes.ts';

export function formatLocalLatencyContext(results: LocalLatencyResult[], category?: string): string {
  const successful = results.filter(result => result.success);
  if (successful.length === 0) {
    const scope = category ? ' for category ' + category : '';
    return 'Desktop local A2S probe' + scope + ' returned no usable local RTT. The desktop supports local A2S testing, but this request had no successful result; do not claim that local latency testing is impossible and do not invent latency values.';
  }
  const lines = successful.slice(0, 6).map((result, index) => {
    const server = result.server;
    return (index + 1) + '. ' + (server.name || (server.ip + ':' + server.port)) + ' | address=' + server.ip + ':' + server.port + ' | local_rtt_ms=' + result.latencyMs + ' | players=' + server.players + '/' + server.maxPlayers + ' | map=' + (server.map || 'unknown') + ' | country=' + (server.countryCode || 'unknown');
  });
  const scope = category ? 'current active ' + category + ' candidates' : 'current active recommendation candidates';
  return [
    'Desktop-measured A2S RTT for the ' + scope + ' only; this is not a global scan. Use these local measurements directly and do not claim that desktop latency testing is unavailable.',
    ...lines,
  ].join('\n');
}

export function recommendedServerToStatus(server: RecommendedServer, latencyMs?: number): ServerStatus {
  return {
    ip: server.ip,
    port: server.port,
    name: server.name,
    map_name: server.map,
    players: server.players,
    max_players: server.maxPlayers,
    real_players: server.players,
    category: server.category,
    country_code: server.countryCode,
    online: true,
    is_online: true,
    local_latency_status: latencyMs === undefined ? undefined : 'success',
    local_latency_ms: latencyMs,
  } as ServerStatus;
}

export function a2sResultToStatus(result: A2SQueryResult): ServerStatus {
  return {
    ip: result.ip,
    port: result.port,
    name: result.name,
    map_name: result.map_name,
    game: result.game,
    players: result.real_players,
    real_players: result.real_players,
    max_players: result.max_players,
    bots: result.bots,
    online: result.success,
    is_online: result.success,
    local_latency_status: result.success ? 'success' : 'failed',
    local_latency_ms: result.latency_ms,
    local_latency_error: result.error,
  } as ServerStatus;
}
