import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerFetchGate } from './serverFetchGate.ts';

test('a silent refresh yields to a pending user fetch without touching it', () => {
  const versionRef = { current: 0 };
  const gate = createServerFetchGate(versionRef);
  const pageChange = gate.begin(false);
  assert.ok(pageChange);

  assert.equal(gate.begin(true), null);
  assert.equal(versionRef.current, pageChange.version);
  assert.equal(gate.isLatest(pageChange.version), true);
  assert.equal(pageChange.abort.signal.aborted, false);

  gate.finish(pageChange.version);
  const refresh = gate.begin(true);
  assert.ok(refresh);
  assert.equal(gate.isLatest(pageChange.version), false);
  assert.equal(gate.isLatest(refresh.version), true);
});

test('a newer request aborts and invalidates the previous one', () => {
  const gate = createServerFetchGate({ current: 0 });
  const background = gate.begin(true);
  const first = gate.begin(false);
  assert.ok(background && first);
  assert.equal(background.abort.signal.aborted, true);
  assert.equal(gate.isLatest(background.version), false);

  const second = gate.begin(false);
  assert.ok(second);
  assert.equal(first.abort.signal.aborted, true);
  assert.equal(second.abort.signal.aborted, false);
  assert.equal(gate.isLatest(first.version), false);
  assert.equal(gate.isLatest(second.version), true);
});

test('only the pending user fetch releases the silent-refresh hold', () => {
  const gate = createServerFetchGate({ current: 0 });
  const first = gate.begin(false);
  const second = gate.begin(false);
  assert.ok(first && second);

  gate.finish(first.version); // the superseded request settles first
  assert.equal(gate.begin(true), null);

  gate.finish(second.version);
  assert.ok(gate.begin(true));
});

test('silent refreshes still supersede each other when no user fetch is pending', () => {
  const gate = createServerFetchGate({ current: 0 });
  const first = gate.begin(true);
  const second = gate.begin(true);
  assert.ok(first && second);
  assert.equal(first.abort.signal.aborted, true);
  gate.finish(first.version);
  assert.equal(gate.isLatest(second.version), true);
  assert.ok(gate.begin(true));
});
