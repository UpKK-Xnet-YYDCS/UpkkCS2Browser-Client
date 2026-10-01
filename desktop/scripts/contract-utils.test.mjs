import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractApiCalls,
  extractCargoLockVersions,
  extractInterfaceKeys,
  extractRustEvents,
  extractRustHandlerCommands,
  findTauriVersionMismatches,
  routeKey,
} from './contract-utils.mjs';

test('extracts positive and negative IPC contract fixtures', () => {
  const rust = `
    .invoke_handler(tauri::generate_handler![window::open_forum_window, a2s::query_server_a2s])
    app.emit("login-token-ready", payload);
  `;
  const types = `
    export interface DesktopCommandMap {
      open_forum_window: Command;
      query_server_a2s: Command;
    }
    export interface DesktopEventMap {
      'login-token-ready': string;
    }
  `;
  assert.deepEqual(extractRustHandlerCommands(rust), ['open_forum_window', 'query_server_a2s']);
  assert.deepEqual(extractRustEvents(rust), ['login-token-ready']);
  assert.deepEqual(extractInterfaceKeys(types, 'DesktopCommandMap'), [
    'open_forum_window',
    'query_server_a2s',
  ]);
  assert.ok(!extractRustHandlerCommands(rust).includes('resolve_hostname'));
});

test('normalizes API templates, queries, methods, and backend placeholders', () => {
  const calls = extractApiCalls(`
    fetchWithRetry(\`/api/server/\${serverId}/stats?period=\${period}\`);
    fetchApi('/api/favorites/add', { method: 'POST', body: '{}' });
    fetchWithRetry(\`/api/servers\${query}\`);
  `);
  assert.deepEqual(calls, [
    { method: 'GET', path: '/api/server/:param/stats' },
    { method: 'POST', path: '/api/favorites/add' },
    { method: 'GET', path: '/api/servers' },
  ]);
  assert.equal(
    routeKey(calls[0].method, calls[0].path),
    routeKey('GET', '/api/server/:id/stats'),
  );
  assert.notEqual(
    routeKey('POST', '/api/server/:id/stats'),
    routeKey('GET', '/api/server/:id/stats'),
  );
});

test('flags Tauri npm packages whose crate is on another major.minor release', () => {
  const crates = extractCargoLockVersions(`version = 4

[[package]]
name = "tauri"
version = "2.12.0"

[[package]]
name = "tauri-plugin-http"
version = "2.7.0"

[[package]]
name = "tauri-plugin-shell"
version = "2.4.0"

[[package]]
name = "tauri-plugin-log"
version = "2.9.2"
`);
  assert.equal(crates.get('tauri-plugin-http'), '2.7.0');
  const npm = new Map([
    ['@tauri-apps/api', '2.12.0'],
    ['@tauri-apps/cli', '2.12.0'],
    ['@tauri-apps/plugin-http', '2.6.1'],
    ['@tauri-apps/plugin-shell', '2.4.0'],
  ]);
  assert.deepEqual(findTauriVersionMismatches(npm, crates), [
    'tauri-plugin-http (v2.7.0) : @tauri-apps/plugin-http (v2.6.1)',
  ]);
  npm.set('@tauri-apps/plugin-http', '2.7.3');
  assert.deepEqual(findTauriVersionMismatches(npm, crates), []);
});
