import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const desktopDir = path.resolve(import.meta.dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const assetsDir = path.join(distDir, 'assets');
const budget = JSON.parse(
  await readFile(path.join(desktopDir, 'performance-budget.json'), 'utf8'),
);
const baselinePath = path.join(desktopDir, 'performance-baseline.json');

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  }));
  return nested.flat();
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? null;
}

function localAssetPath(reference) {
  if (/^(?:[a-z]+:)?\/\//i.test(reference) || reference.startsWith('data:')) return null;
  const cleanReference = reference.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  const resolved = path.resolve(distDir, cleanReference);
  const relative = path.relative(distDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Initial asset resolves outside dist: ${reference}`);
  }
  return resolved;
}

function formatBytes(bytes) {
  return `${bytes} B (${(bytes / 1024).toFixed(1)} KiB)`;
}

function logicalAssetName(file) {
  return path.basename(file).replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '.$1');
}

function printAssetTable(measured, baselineAssets = {}) {
  console.log('Asset breakdown (gzip):');
  for (const asset of [...measured].sort((left, right) => right.gzipBytes - left.gzipBytes)) {
    const name = logicalAssetName(asset.file);
    const baseline = baselineAssets[name];
    const delta = baseline ? asset.gzipBytes - baseline.gzipBytes : null;
    const deltaLabel = delta === null ? 'new' : `${delta >= 0 ? '+' : ''}${delta} B`;
    console.log(
      `- ${name}: raw ${formatBytes(asset.rawBytes)}, gzip ${formatBytes(asset.gzipBytes)}, ${deltaLabel}`,
    );
  }
}

function emitWarning(message) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.warn(`::warning title=Desktop bundle growth::${message}`);
  } else {
    console.warn(`Performance warning: ${message}`);
  }
}

async function measureFiles(files) {
  let rawBytes = 0;
  let gzipBytes = 0;
  const measured = [];
  for (const file of files) {
    const contents = await readFile(file);
    const compressedBytes = gzipSync(contents, { level: 9 }).byteLength;
    rawBytes += contents.byteLength;
    gzipBytes += compressedBytes;
    measured.push({ file, rawBytes: contents.byteLength, gzipBytes: compressedBytes });
  }
  return { rawBytes, gzipBytes, measured };
}

try {
  const html = await readFile(path.join(distDir, 'index.html'), 'utf8');
  const initialReferences = new Set();
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    if (readAttribute(tag, 'type')?.toLowerCase() !== 'module') continue;
    const source = readAttribute(tag, 'src');
    if (source) initialReferences.add(source);
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const relationships = readAttribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
    if (!relationships.includes('stylesheet') && !relationships.includes('modulepreload')) continue;
    const reference = readAttribute(tag, 'href');
    if (reference) initialReferences.add(reference);
  }

  const initialFiles = [...initialReferences]
    .map(localAssetPath)
    .filter(Boolean);
  for (const file of initialFiles) await stat(file);
  const allAssetFiles = await collectFiles(assetsDir);
  const initial = await measureFiles(initialFiles);
  const allAssets = await measureFiles(allAssetFiles);
  const javascript = allAssets.measured.filter(asset => asset.file.endsWith('.js'));
  const css = allAssets.measured.filter(asset => asset.file.endsWith('.css'));
  const largestJavaScript = javascript.reduce(
    (largest, asset) => !largest || asset.gzipBytes > largest.gzipBytes ? asset : largest,
    null,
  );
  const cssGzipBytes = css.reduce((total, asset) => total + asset.gzipBytes, 0);

  if (process.argv.includes('--print-baseline')) {
    const assets = Object.fromEntries(
      allAssets.measured
        .map(asset => [logicalAssetName(asset.file), {
          rawBytes: asset.rawBytes,
          gzipBytes: asset.gzipBytes,
        }])
        .sort(([left], [right]) => left.localeCompare(right)),
    );
    console.log(JSON.stringify({ allAssetsGzipBytes: allAssets.gzipBytes, assets }, null, 2));
    process.exit(0);
  }

  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));

  console.log(`Initial assets: raw ${formatBytes(initial.rawBytes)}, gzip ${formatBytes(initial.gzipBytes)}`);
  console.log(`All assets: raw ${formatBytes(allAssets.rawBytes)}, gzip ${formatBytes(allAssets.gzipBytes)}`);
  console.log(
    `Largest JS gzip: ${formatBytes(largestJavaScript?.gzipBytes ?? 0)}` +
    `${largestJavaScript ? ` (${path.basename(largestJavaScript.file)})` : ''}`,
  );
  console.log(`Total CSS gzip: ${formatBytes(cssGzipBytes)}`);
  printAssetTable(allAssets.measured, baseline.assets);

  const totalGrowth = allAssets.gzipBytes - baseline.allAssetsGzipBytes;
  if (totalGrowth > baseline.warningThresholds.totalGzipGrowthBytes) {
    emitWarning(
      `all-assets gzip grew by ${totalGrowth} B; warning threshold is ` +
      `${baseline.warningThresholds.totalGzipGrowthBytes} B`,
    );
  }
  for (const asset of allAssets.measured) {
    const name = logicalAssetName(asset.file);
    const previous = baseline.assets[name];
    if (!previous) continue;
    const growth = asset.gzipBytes - previous.gzipBytes;
    if (growth > baseline.warningThresholds.chunkGzipGrowthBytes) {
      emitWarning(
        `${name} gzip grew by ${growth} B; warning threshold is ` +
        `${baseline.warningThresholds.chunkGzipGrowthBytes} B`,
      );
    }
  }

  const violations = [];
  if (initial.rawBytes > budget.initialAssets.rawBytes) {
    violations.push(`initial raw ${initial.rawBytes} > ${budget.initialAssets.rawBytes}`);
  }
  if (initial.gzipBytes > budget.initialAssets.gzipBytes) {
    violations.push(`initial gzip ${initial.gzipBytes} > ${budget.initialAssets.gzipBytes}`);
  }
  if (allAssets.rawBytes > budget.allAssets.rawBytes) {
    violations.push(`all-assets raw ${allAssets.rawBytes} > ${budget.allAssets.rawBytes}`);
  }
  if (allAssets.gzipBytes > budget.allAssets.gzipBytes) {
    violations.push(`all-assets gzip ${allAssets.gzipBytes} > ${budget.allAssets.gzipBytes}`);
  }
  if ((largestJavaScript?.gzipBytes ?? 0) > budget.maxJavaScriptChunkGzipBytes) {
    violations.push(
      `largest JS gzip ${largestJavaScript.gzipBytes} > ${budget.maxJavaScriptChunkGzipBytes}`,
    );
  }
  if (cssGzipBytes > budget.maxCssGzipBytes) {
    violations.push(`CSS gzip ${cssGzipBytes} > ${budget.maxCssGzipBytes}`);
  }

  if (violations.length > 0) {
    console.error('Performance budget failed:');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.log('Performance budget passed.');
} catch (error) {
  console.error(`Performance budget could not run: ${error.message}`);
  process.exit(1);
}
