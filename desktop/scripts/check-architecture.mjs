import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const desktopDir = path.resolve(import.meta.dirname, '..');
const budgetPath = path.join(desktopDir, 'architecture-budget.json');
const budget = JSON.parse(await readFile(budgetPath, 'utf8'));
const productionRoots = [
  path.join(desktopDir, 'src'),
  path.join(desktopDir, 'src-tauri', 'src'),
];
const productionExtension = /\.(?:ts|tsx|rs)$/;
const testFile = /\.test\.(?:ts|tsx)$|\/tests(?:\/|\.rs$)|_test\.rs$/;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  }));
  return nested.flat();
}

function relativePath(file) {
  return path.relative(desktopDir, file).split(path.sep).join('/');
}

function countLines(source) {
  if (source.length === 0) return 0;
  const lines = source.split(/\r?\n/).length;
  return /\r?\n$/.test(source) ? lines - 1 : lines;
}

function importedProjectModules(source, importer) {
  const modules = [];
  const expression = /(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(expression)) {
    const specifier = match[1];
    if (specifier.startsWith('@/')) {
      modules.push(`src/${specifier.slice(2)}`);
    } else if (specifier.startsWith('.')) {
      modules.push(path.normalize(path.join(path.dirname(importer), specifier)).split(path.sep).join('/'));
    }
  }
  return modules;
}

const dataFilePatterns = (budget.dataFilePatterns ?? []).map((entry) => ({
  regex: new RegExp(entry.pattern),
  maxLines: entry.maxLines,
}));

function dataFileLineLimit(relative) {
  for (const entry of dataFilePatterns) {
    if (entry.regex.test(relative)) return entry.maxLines;
  }
  return null;
}

const files = (await Promise.all(productionRoots.map(collectFiles)))
  .flat()
  .filter(file => productionExtension.test(file) && !testFile.test(relativePath(file)));
const violations = [];

for (const file of files) {
  const relative = relativePath(file);
  const source = await readFile(file, 'utf8');
  const dataLimit = dataFileLineLimit(relative);
  const lineLimit = dataLimit ?? budget.oversizedFileLineLimits[relative] ?? budget.maxProductionFileLines;
  const lineCount = countLines(source);
  if (lineCount > lineLimit) {
    violations.push(`${relative}: ${lineCount} lines exceeds ${lineLimit}`);
  }
  if (
    dataLimit === null &&
    Object.hasOwn(budget.oversizedFileLineLimits, relative) &&
    lineCount < lineLimit
  ) {
    violations.push(
      `${relative}: lower its ratchet from ${lineLimit} to ${lineCount}` +
      `${lineCount <= budget.maxProductionFileLines ? ' (or remove the entry)' : ''}`,
    );
  }

  if (relative.startsWith('src/') && !relative.startsWith('src/services/')) {
    const matches = source.match(/@tauri-apps\//g);
    if (matches) {
      violations.push(
        `${relative}: ${matches.length} direct @tauri-apps import(s); use src/services/`,
      );
    }
  }

  if (relative.startsWith('src/')) {
    const imports = importedProjectModules(source, relative);
    if (
      relative !== 'src/App.tsx' &&
      !relative.startsWith('src/pages/') &&
      imports.some(target => target.startsWith('src/pages/'))
    ) {
      violations.push(`${relative}: non-page module imports src/pages/`);
    }
    if (
      relative.startsWith('src/store/') &&
      imports.some(target => target.startsWith('src/components/'))
    ) {
      violations.push(`${relative}: store imports src/components/`);
    }
    if (
      (relative.startsWith('src/api/') || relative.startsWith('src/services/')) &&
      imports.some(target => target.startsWith('src/store/'))
    ) {
      violations.push(`${relative}: API/service imports src/store/`);
    }
  }
}

const oversizedPaths = new Set(Object.keys(budget.oversizedFileLineLimits));
for (const relative of oversizedPaths) {
  if (!files.some(file => relativePath(file) === relative)) {
    violations.push(`${relative}: stale oversized-file budget entry; remove it after the file moves`);
  }
}

if (violations.length > 0) {
  console.error('Architecture budget failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Architecture budget passed: ${files.length} production files, ` +
  `${oversizedPaths.size} ratcheted legacy files.`,
);
