import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRuleEditorServerEntries,
  filterRuleEditorServers,
  paginateRuleEditorServers,
  toggleSelectedServer,
  addUniqueMapPattern,
} from './ruleEditorServers.ts';

test('buildRuleEditorServerEntries keeps local-only addresses after cloud keys', () => {
  const entries = buildRuleEditorServerEntries(
    [{ server_ip: '1.1.1.1', server_port: '27015', current_name: 'Cloud', map_name: 'ze_a' }],
    ['1.1.1.1:27015', '2.2.2.2:27015'],
    { '2.2.2.2:27015': 'Local Box' },
  );
  assert.deepEqual(entries.map(entry => [entry.key, entry.source, entry.name]), [
    ['1.1.1.1:27015', 'cloud', 'Cloud'],
    ['2.2.2.2:27015', 'local', 'Local Box'],
  ]);
});

test('filter and paginate rule editor servers by name, address, and map', () => {
  const entries = buildRuleEditorServerEntries(
    [
      { server_ip: '1.1.1.1', server_port: '27015', server_name: 'Alpha', map_name: 'ze_map' },
      { server_ip: '3.3.3.3', server_port: '27015', server_name: 'Beta', map_name: 'kz_map' },
    ],
    [],
    {},
  );
  assert.equal(filterRuleEditorServers(entries, 'kz').length, 1);
  assert.equal(filterRuleEditorServers(entries, '3.3.3.3').length, 1);
  const page = paginateRuleEditorServers(entries, 1, 1);
  assert.equal(page.totalPages, 2);
  assert.equal(page.pageItems[0].name, 'Alpha');
});


test('toggles server selection and ignores duplicate map patterns', () => {
  assert.deepEqual(toggleSelectedServer(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleSelectedServer(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(addUniqueMapPattern(['ze_*'], '  ze_*  '), ['ze_*']);
  assert.deepEqual(addUniqueMapPattern(['ze_*'], 'surf_*'), ['ze_*', 'surf_*']);
});
