import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

async function createVersionFixture(packageVersion = '1.7.0') {
  const directory = await mkdtemp(path.join(tmpdir(), 'desktop-version-contract-'));
  await mkdir(path.join(directory, 'src-tauri'));
  const script = await readFile(new URL('../sync-version.sh', import.meta.url), 'utf8');
  await Promise.all([
    writeFile(path.join(directory, 'sync-version.sh'), script),
    writeFile(path.join(directory, 'version.txt'), '1.7.0\n'),
    writeFile(path.join(directory, 'package.json'), JSON.stringify({ version: packageVersion })),
    writeFile(path.join(directory, 'src-tauri', 'tauri.conf.json'), JSON.stringify({ version: '1.7.0' })),
    writeFile(path.join(directory, 'src-tauri', 'Cargo.toml'), '[package]\nversion = "1.7.0"\n'),
  ]);
  await chmod(path.join(directory, 'sync-version.sh'), 0o755);
  return directory;
}

test('version --check accepts aligned files and rejects drift', async () => {
  const aligned = await createVersionFixture();
  const drifted = await createVersionFixture('1.7.1');
  try {
    const success = spawnSync('bash', ['sync-version.sh', '--check'], {
      cwd: aligned,
      encoding: 'utf8',
    });
    assert.equal(success.status, 0, success.stderr);
    assert.match(success.stdout, /Version check passed: 1\.7\.0/);

    const failure = spawnSync('bash', ['sync-version.sh', '--check'], {
      cwd: drifted,
      encoding: 'utf8',
    });
    assert.equal(failure.status, 1);
    assert.match(failure.stderr, /package\.json=1\.7\.1/);
  } finally {
    await Promise.all([
      rm(aligned, { recursive: true, force: true }),
      rm(drifted, { recursive: true, force: true }),
    ]);
  }
});
