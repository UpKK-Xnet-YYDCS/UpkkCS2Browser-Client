import assert from 'node:assert/strict';
import test from 'node:test';
import { createStableLatencyProjector } from './latencyDisplay.ts';
import { createLatencyFixtureServer } from './performanceFixtures.ts';
import {
  createLatencySnapshotStore,
  listenForProjectionChange,
} from './latencySnapshotStore.ts';

test('apply ignores identical snapshots and notifies once for a batch', () => {
  const store = createLatencySnapshotStore();
  let notifies = 0;
  store.subscribe(() => {
    notifies += 1;
  });

  const first = { status: 'success' as const, latencyMs: 40, updatedAt: 1 };
  assert.equal(store.apply({ '10.0.0.1:27015': first }), true);
  assert.equal(notifies, 1);
  assert.equal(store.apply({ '10.0.0.1:27015': { ...first } }), false);
  assert.equal(notifies, 1);
  assert.equal(store.apply({
    '10.0.0.1:27015': { status: 'success', latencyMs: 41, updatedAt: 2 },
    '10.0.0.2:27015': { status: 'success', latencyMs: 90, updatedAt: 2 },
  }), true);
  assert.equal(notifies, 2);
});

test('deferred notify stays silent until flush, then delivers the latest map', () => {
  const store = createLatencySnapshotStore();
  let notifies = 0;
  store.subscribe(() => {
    notifies += 1;
  });
  store.apply({ '10.0.0.1:27015': { status: 'success', latencyMs: 10, updatedAt: 1 } }, { notify: false });
  assert.equal(notifies, 0);
  store.apply({ '10.0.0.1:27015': { status: 'success', latencyMs: 11, updatedAt: 2 } }, { notify: false });
  assert.equal(notifies, 0);
  store.flushNotify();
  assert.equal(notifies, 1);
  assert.equal(store.getSnapshots()['10.0.0.1:27015']?.latencyMs, 11);
  store.flushNotify();
  assert.equal(notifies, 1);
});

test('projection listeners skip snapshots that cannot change the visible set', () => {
  const visible = createLatencyFixtureServer(0, { local_latency_ms: 60 });
  const hidden = createLatencyFixtureServer(1, { local_latency_ms: 400 });
  const servers = [visible, hidden];
  const store = createLatencySnapshotStore();
  const project = createStableLatencyProjector();
  store.apply({
    [`${visible.ip}:27015`]: { status: 'success', latencyMs: 60, updatedAt: 1 },
    [`${hidden.ip}:27015`]: { status: 'success', latencyMs: 400, updatedAt: 1 },
  });

  let emits = 0;
  const unsubscribe = listenForProjectionChange(
    listener => store.subscribe(listener),
    () => project(servers, store.getSnapshots(), 'le80'),
    () => {
      emits += 1;
    },
  );

  store.apply({
    [`${hidden.ip}:27015`]: { status: 'success', latencyMs: 500, updatedAt: 2 },
  });
  assert.equal(emits, 0);

  store.apply({
    [`${visible.ip}:27015`]: { status: 'success', latencyMs: 120, updatedAt: 3 },
  });
  assert.equal(emits, 1);
  unsubscribe();
});
