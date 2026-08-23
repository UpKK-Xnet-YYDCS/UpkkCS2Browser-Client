import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractApiCalls,
  extractInterfaceKeys,
  extractRustEvents,
  extractRustHandlerCommands,
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
