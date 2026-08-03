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

  console.log(`Initial assets: raw ${formatBytes(initial.rawBytes)}, gzip ${formatBytes(initial.gzipBytes)}`);
  console.log(`All assets: raw ${formatBytes(allAssets.rawBytes)}, gzip ${formatBytes(allAssets.gzipBytes)}`);
  console.log(
    `Largest JS gzip: ${formatBytes(largestJavaScript?.gzipBytes ?? 0)}` +
    `${largestJavaScript ? ` (${path.basename(largestJavaScript.file)})` : ''}`,
  );
  console.log(`Total CSS gzip: ${formatBytes(cssGzipBytes)}`);

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
