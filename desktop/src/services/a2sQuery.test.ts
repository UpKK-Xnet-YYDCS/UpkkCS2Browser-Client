import assert from 'node:assert/strict';
import test from 'node:test';
import { buildA2SInvokeArgs } from './a2sQuery.ts';

test('A2S IPC keeps domain and IPv4 targets unchanged for Rust resolution', () => {
  assert.deepEqual(buildA2SInvokeArgs('server.example.com', '27015', { timeoutMs: 1500 }), {
    ip: 'server.example.com',
    port: '27015',
    timeoutMs: 1500,
  });
  assert.deepEqual(buildA2SInvokeArgs('127.0.0.1', '27016'), {
    ip: '127.0.0.1',
    port: '27016',
  });
});
