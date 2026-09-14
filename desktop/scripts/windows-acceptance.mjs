#!/usr/bin/env node
/**
 * Windows native acceptance harness for the desktop performance program.
 *
 * This host cannot invent WebView2 timings. On Windows it records environment
 * (OS, WebView2, power scheme, git revision) and writes a 30-run result template.
 * Fill timings from a 1280×800 release build, then re-run with --verify.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(desktopDir, '..');
const outputDir = path.join(desktopDir, '.acceptance');
const defaultOutput = path.join(outputDir, 'windows-acceptance-results.json');

const SCENES = [
  'startup_cold',
  'startup_warm',
  'list_default_page',
  'list_max_page',
  'favorites_100',
  'ai_200_chunks',
  'background_30m',
];

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values, p) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function gitRevision() {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function windowsEnv() {
  if (process.platform !== 'win32') {
    return {
      os: `${process.platform} ${process.arch}`,
      webView2: null,
      powerScheme: null,
      note: 'Native Windows timings cannot be collected on this host.',
    };
  }
  const env = {
    os: null,
    webView2: null,
    powerScheme: null,
  };
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      '(Get-CimInstance Win32_OperatingSystem).Caption + " " + (Get-CimInstance Win32_OperatingSystem).Version',
    ]);
    env.os = stdout.trim();
  } catch {
    env.os = process.env.OS ?? 'windows';
  }
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      '(Get-ItemProperty -Path "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue).pv',
    ]);
    env.webView2 = stdout.trim() || null;
  } catch {
    env.webView2 = null;
  }
  try {
    const { stdout } = await execFileAsync('powercfg', ['/getactivescheme']);
    env.powerScheme = stdout.trim() || null;
  } catch {
    env.powerScheme = null;
  }
  return env;
}

function emptyRuns() {
  return Array.from({ length: 30 }, () => null);
}

function buildTemplate(revision, env) {
  return {
    protocol: 'desktop-windows-acceptance-v1',
    window: { width: 1280, height: 800 },
    build: 'release',
    gitRevision: revision,
    environment: env,
    scenes: Object.fromEntries(SCENES.map(scene => [scene, {
      unit: scene.startsWith('background') ? 'ms_rss_heap' : 'ms',
      samples: emptyRuns(),
      median: null,
      p95: null,
    }])),
    firstBootAfterRebootMs: null,
    stability8h: { completed: false, notes: '' },
    traces: {
      webView2DevTools: false,
      wprWpa: false,
      includesCredentials: false,
    },
  };
}

function verify(results) {
  const errors = [];
  if (results.protocol !== 'desktop-windows-acceptance-v1') {
    errors.push('protocol mismatch');
  }
  if (results.window?.width !== 1280 || results.window?.height !== 800) {
    errors.push('window must be 1280×800');
  }
  if (results.build !== 'release') {
    errors.push('build must be release');
  }
  if (results.traces?.includesCredentials) {
    errors.push('traces must not include credentials');
  }
  for (const scene of SCENES) {
    if (scene === 'background_30m') continue;
    const entry = results.scenes?.[scene];
    const samples = (entry?.samples ?? []).filter(value => typeof value === 'number' && Number.isFinite(value));
    if (samples.length < 30) {
      errors.push(`${scene}: need 30 numeric samples, have ${samples.length}`);
      continue;
    }
    const expectedMedian = median(samples);
    const expectedP95 = percentile(samples, 95);
    if (entry.median !== expectedMedian || entry.p95 !== expectedP95) {
      errors.push(`${scene}: median/p95 must match the 30 samples`);
    }
  }
  if (results.stability8h?.completed !== true) {
    errors.push('8-hour stability is not marked complete');
  }
  if (results.traces?.webView2DevTools !== true || results.traces?.wprWpa !== true) {
    errors.push('WebView2 DevTools and WPR/WPA traces are required');
  }
  return errors;
}

export {
  SCENES,
  buildTemplate,
  median,
  percentile,
  verify,
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const verifyIndex = process.argv.indexOf('--verify');
  const verifyPath = verifyIndex >= 0
    ? (process.argv[verifyIndex + 1] ?? defaultOutput)
    : null;

  if (verifyPath) {
    const results = JSON.parse(await readFile(verifyPath, 'utf8'));
    const errors = verify(results);
    if (errors.length > 0) {
      console.error('Windows acceptance verification failed:');
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log(`Windows acceptance file verified: ${verifyPath}`);
    process.exit(0);
  }

  const revision = await gitRevision();
  const env = await windowsEnv();
  const template = buildTemplate(revision, env);
  await mkdir(outputDir, { recursive: true });
  await writeFile(defaultOutput, `${JSON.stringify(template, null, 2)}\n`);
  console.log(`Wrote ${defaultOutput}`);
  if (process.platform !== 'win32') {
    console.log('Fill this file on the Windows acceptance machine after 30× release timings; then run:');
    console.log('  node desktop/scripts/windows-acceptance.mjs --verify desktop/.acceptance/windows-acceptance-results.json');
    process.exit(2);
  }
  console.log('Record 30 samples per timed scene on a 1280×800 release build, then --verify.');
}
