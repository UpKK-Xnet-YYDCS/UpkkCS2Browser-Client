import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

const script = path.join(import.meta.dirname, 'check-performance.mjs');

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'desktop-bundle-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'scripts'));
  await mkdir(path.join(directory, 'dist', 'assets'), { recursive: true });
  const checker = path.join(directory, 'scripts', 'check-performance.mjs');
  await copyFile(script, checker);
  const assets = {};
  for (const name of ['entry', 'lazy']) {
    const contents = Buffer.concat(Array.from({ length: 256 }, (_, index) =>
      createHash('sha256').update(`${name}:${index}`).digest(),
    ));
    await writeFile(path.join(directory, 'dist', 'assets', `${name}-abcdefgh.js`), contents);
    assets[`${name}.js`] = {
      rawBytes: contents.length,
      gzipBytes: gzipSync(contents, { level: 9 }).length,
    };
  }
  await writeFile(path.join(directory, 'dist', 'index.html'),
    '<script type="module" src="/assets/entry-abcdefgh.js"></script>');
  const baseline = {
    growthThresholds: { totalGzipGrowthBytes: 1024, chunkGzipGrowthBytes: 5120 },
    initialAssets: { ...assets['entry.js'] },
    allAssetsGzipBytes: Object.values(assets).reduce((sum, asset) => sum + asset.gzipBytes, 0),
    assets,
  };
  const budget = {
    initialAssets: { rawBytes: 100000, gzipBytes: 100000 },
    allAssets: { rawBytes: 100000, gzipBytes: 100000 },
    maxJavaScriptChunkGzipBytes: 100000,
    maxCssGzipBytes: 100000,
  };
  async function save() {
    await writeFile(path.join(directory, 'performance-budget.json'), JSON.stringify(budget));
    await writeFile(path.join(directory, 'performance-baseline.json'), JSON.stringify(baseline));
  }
  await save();
  return {
    directory, baseline, budget, save,
    run(...args) {
      return spawnSync(process.execPath, [checker, ...args], { encoding: 'utf8', cwd: directory });
    },
  };
}

test('accepts the unchanged bundle and a changed content hash', async t => {
  const f = await fixture(t);
  await rename(path.join(f.directory, 'dist/assets/lazy-abcdefgh.js'),
    path.join(f.directory, 'dist/assets/lazy-12345678.js'));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Performance budget and baseline passed/);
});

test('accepts initial, total and chunk growth exactly at their limits', async t => {
  const f = await fixture(t);
  f.baseline.initialAssets.gzipBytes -= 1024;
  f.baseline.assets['entry.js'].gzipBytes += 4096;
  f.baseline.assets['lazy.js'].gzipBytes -= 5120;
  f.baseline.allAssetsGzipBytes -= 1024;
  await f.save();
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
});

test('fails total growth beyond 1 KiB even below the absolute budget', async t => {
  const f = await fixture(t);
  f.baseline.assets['lazy.js'].gzipBytes -= 1025;
  f.baseline.allAssetsGzipBytes -= 1025;
  await f.save();
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /all-assets gzip grew by 1025 B; growth limit is 1024 B/);
});

test('fails initial growth even when total size and individual chunks are unchanged', async t => {
  const f = await fixture(t);
  f.baseline.initialAssets.gzipBytes -= 1025;
  await f.save();
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /initial-assets gzip grew by 1025 B/);
  assert.doesNotMatch(result.stderr, /all-assets gzip grew/);
});

test('fails chunk growth beyond 5 KiB even when another chunk shrinks', async t => {
  const f = await fixture(t);
  f.baseline.assets['lazy.js'].gzipBytes -= 5121;
  f.baseline.assets['entry.js'].gzipBytes += 5121;
  await f.save();
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /lazy\.js gzip grew by 5121 B; growth limit is 5120 B/);
  assert.doesNotMatch(result.stderr, /all-assets gzip grew/);
});

test('requires review of new and removed logical assets', async t => {
  const f = await fixture(t);
  await rename(path.join(f.directory, 'dist/assets/lazy-abcdefgh.js'),
    path.join(f.directory, 'dist/assets/renamed-abcdefgh.js'));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /renamed\.js: missing from performance baseline/);
  assert.match(result.stderr, /lazy\.js: stale performance baseline entry/);
});

test('rejects duplicate logical names instead of overwriting a baseline measurement', async t => {
  const f = await fixture(t);
  await copyFile(path.join(f.directory, 'dist/assets/lazy-abcdefgh.js'),
    path.join(f.directory, 'dist/assets/lazy-12345678.js'));
  for (const args of [[], ['--print-baseline']]) {
    const result = f.run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Duplicate logical asset name: lazy\.js/);
  }
});

test('rejects malformed growth thresholds and inconsistent baseline totals', async t => {
  const f = await fixture(t);
  for (const value of [null, -1, '1024']) {
    f.baseline.growthThresholds.totalGzipGrowthBytes = value;
    await f.save();
    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /baseline total growth threshold must be a non-negative integer/);
  }
  f.baseline.growthThresholds.totalGzipGrowthBytes = 1024;
  f.baseline.allAssetsGzipBytes += 1;
  await f.save();
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /baseline all-assets gzip must equal the sum of its assets/);
});

test('printing a reviewed baseline preserves limits and passes when used for the same bundle', async t => {
  const f = await fixture(t);
  await rename(path.join(f.directory, 'dist/assets/lazy-abcdefgh.js'),
    path.join(f.directory, 'dist/assets/renamed-abcdefgh.js'));
  const original = await readFile(path.join(f.directory, 'performance-baseline.json'), 'utf8');
  const result = f.run('--print-baseline');
  assert.equal(result.status, 0, result.stderr);
  const printed = JSON.parse(result.stdout);
  assert.deepEqual(printed.growthThresholds, f.baseline.growthThresholds);
  assert.deepEqual(printed.initialAssets, f.baseline.initialAssets);
  assert.ok(printed.assets['renamed.js']);
  assert.equal(printed.assets['lazy.js'], undefined);
  assert.equal(await readFile(path.join(f.directory, 'performance-baseline.json'), 'utf8'), original);
  await writeFile(path.join(f.directory, 'performance-baseline.json'), result.stdout);
  assert.equal(f.run().status, 0);
});

for (const metric of ['initial raw', 'initial gzip', 'all-assets raw', 'all-assets gzip', 'largest JS gzip', 'CSS gzip']) {
  test(`retains the ${metric} hard budget, including when printing a baseline`, async t => {
    const f = await fixture(t);
    if (metric === 'initial raw') f.budget.initialAssets.rawBytes = 1;
    if (metric === 'initial gzip') f.budget.initialAssets.gzipBytes = 1;
    if (metric === 'all-assets raw') f.budget.allAssets.rawBytes = 1;
    if (metric === 'all-assets gzip') f.budget.allAssets.gzipBytes = 1;
    if (metric === 'largest JS gzip') f.budget.maxJavaScriptChunkGzipBytes = 1;
    if (metric === 'CSS gzip') {
      f.budget.maxCssGzipBytes = 1;
      await writeFile(path.join(f.directory, 'dist/assets/style-abcdefgh.css'), 'body { color: red; }');
    }
    await f.save();
    for (const args of [[], ['--print-baseline']]) {
      const result = f.run(...args);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes(`${metric} `), result.stderr);
    }
  });
}
