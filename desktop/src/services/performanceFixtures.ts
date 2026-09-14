import type { ServerStatus } from '../types/server.ts';

export const PERFORMANCE_FIXTURE_COUNTS = [100, 1_000, 5_000] as const;

export function createLatencyFixtureServer(
  index: number,
  overrides: Partial<ServerStatus> = {},
): ServerStatus {
  const ip = `10.0.${Math.floor(index / 256)}.${index % 256}`;
  return {
    name: `Server ${index + 1}`,
    ip,
    port: '27015',
    game: 'cs2',
    region: '',
    mode: '',
    players: 1,
    max_players: 64,
    bots: 0,
    real_players: 1,
    map_name: 'de_mirage',
    comments: '',
    display_address: ip,
    mapnamecn: '',
    category: '',
    priority: 0,
    config_order: 0,
    admin_sort_priority: 0,
    submitter_uid: 0,
    country_code: '',
    country_name: '',
    continent: '',
    geo_region: '',
    server_type: '',
    environment: '',
    vac: false,
    password: false,
    version: '',
    game_id: 730,
    last_updated: '',
    local_latency_status: 'success',
    local_latency_ms: 80,
    ...overrides,
  };
}

export function createLatencyFixtureServers(count: number): ServerStatus[] {
  return Array.from({ length: count }, (_, index) => createLatencyFixtureServer(index));
}
