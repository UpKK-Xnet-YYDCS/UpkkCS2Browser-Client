import assert from 'node:assert/strict';
import test from 'node:test';
import type { ServerStatus } from '../types/server.ts';
import { getServerEntityKey, normalizeServerStatus, reconcileServerEntities } from './serverEntities.ts';

function server(overrides: Partial<ServerStatus> = {}): ServerStatus {
  return {
    name: 'One', ip: '127.0.0.1', port: 27015, game: 'cs2', region: '', mode: '', players: 1,
    max_players: 20, bots: 0, real_players: 1, map_name: 'de_dust2', comments: '', display_address: '',
    mapnamecn: '', category: '', priority: 0, config_order: 0, admin_sort_priority: 0, submitter_uid: 0,
    country_code: '', country_name: '', continent: '', geo_region: '', server_type: '', environment: '',
    vac: false, password: false, version: '', game_id: 0, last_updated: '', ...overrides,
  };
}

test('normalizes legacy server fields into the canonical shape', () => {
  const normalized = normalizeServerStatus(server({ name: '', ip: '', port: '', Name: 'Legacy', Addr: 'one.test', Port: 27016 }));
  assert.equal(normalized.name, 'Legacy');
  assert.equal(normalized.ip, 'one.test');
  assert.equal(normalized.port, 27016);
  assert.equal(getServerEntityKey(normalized), 'one.test:27016');
});

test('reuses unchanged entities and replaces only changed servers', () => {
  const first = server();
  const second = server({ ip: '127.0.0.2' });
  const reconciled = reconcileServerEntities([first, second], [
    { ...first },
    { ...second, players: 2 },
  ]);
  assert.equal(reconciled[0], first);
  assert.notEqual(reconciled[1], second);
  assert.equal(reconciled[1].players, 2);
});
