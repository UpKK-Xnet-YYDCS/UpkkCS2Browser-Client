import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addressesMissingFromCheck,
  detailsFromMonitorServers,
  queryMonitoredServerDetails,
} from './monitoredServerDetails.ts';
import type { MonitorServerInfo } from './monitorQuery.ts';

const checked: MonitorServerInfo[] = [
  {
    key: '10.6.0.1:27015',
    name: 'Checked',
    mapName: 'de_dust2',
    players: 4,
    maxPlayers: 10,
    isOnline: true,
    gameName: 'cs2',
  },
  {
    key: '10.6.0.2:27015',
    name: 'Offline',
    mapName: '',
    players: 0,
    maxPlayers: 0,
    isOnline: false,
    gameName: '',
  },
];

test('checked monitor servers cover online rows and leave new addresses for one batch', async () => {
  const details = detailsFromMonitorServers(checked, '12:00:00');
  assert.equal(details.get('10.6.0.1:27015')?.map, 'de_dust2');
  assert.equal(details.has('10.6.0.2:27015'), false);
  assert.deepEqual(
    addressesMissingFromCheck(['10.6.0.1:27015', '10.6.0.2:27015', '10.6.0.3:27015'], checked),
    ['10.6.0.3:27015'],
  );

  const batches: string[] = [];
  const queried = await queryMonitoredServerDetails(
    ['10.6.0.3:27015', 'bad'],
    async (targets) => {
      batches.push(targets.map(target => `${target.ip}:${target.port}`).join(','));
      return [{
        success: true,
        ip: '10.6.0.3',
        port: '27015',
        name: 'Fresh',
        map_name: 'de_mirage',
        game: '',
        players: 2,
        max_players: 12,
        bots: 1,
        real_players: 1,
        server_type: '',
        environment: '',
        password: false,
        vac: false,
        version: '',
      }];
    },
    '12:01:00',
  );

  assert.deepEqual(batches, ['10.6.0.3:27015']);
  assert.equal(queried.get('10.6.0.3:27015')?.players, 1);
  assert.equal(queried.get('10.6.0.3:27015')?.updatedAt, '12:01:00');
});
