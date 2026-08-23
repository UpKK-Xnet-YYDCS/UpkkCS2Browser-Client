import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  extractApiCalls,
  extractInterfaceKeys,
  extractLiteralCalls,
  extractRustEvents,
  extractRustHandlerCommands,
  routeKey,
} from './contract-utils.mjs';

const desktopDir = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(desktopDir, 'src');
const rustDir = path.join(desktopDir, 'src-tauri', 'src');
const desktopTypesPath = path.join(sourceDir, 'types', 'desktop.ts');
const runtimePath = path.join(sourceDir, 'services', 'desktopRuntime.ts');
const routeMatrixPath = path.join(desktopDir, '..', 'go-gin-backend', 'docs', 'route-matrix.json');

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target, extension) : [target];
  }));
  return nested.flat().filter(file => extension.test(file));
}

function relative(file) {
  return path.relative(desktopDir, file).split(path.sep).join('/');
}

function compareSets(label, expected, actual, violations) {
  for (const value of expected) {
    if (!actual.has(value)) violations.push(`${label}: missing ${value}`);
  }
  for (const value of actual) {
    if (!expected.has(value)) violations.push(`${label}: unexpected ${value}`);
  }
}

const [typescriptFiles, rustFiles, desktopTypes, routeMatrixSource, defaultCapabilitySource] = await Promise.all([
  collectFiles(sourceDir, /\.tsx?$/),
  collectFiles(rustDir, /\.rs$/),
  readFile(desktopTypesPath, 'utf8'),
  readFile(routeMatrixPath, 'utf8'),
  readFile(path.join(desktopDir, 'src-tauri', 'capabilities', 'default.json'), 'utf8'),
]);
const productionTypescript = typescriptFiles.filter(file => !/\.test\.tsx?$/.test(file));
const rustSources = await Promise.all(rustFiles.map(file => readFile(file, 'utf8')));
const violations = [];
const defaultCapability = JSON.parse(defaultCapabilitySource);
if (
  defaultCapability.windows.length !== 1 ||
  defaultCapability.windows[0] !== 'main'
) {
  violations.push('default capability must only target the main window');
}

const handlerCommands = new Set(extractRustHandlerCommands(
  await readFile(path.join(rustDir, 'lib.rs'), 'utf8'),
));
const typedCommands = new Set(extractInterfaceKeys(desktopTypes, 'DesktopCommandMap'));
compareSets('DesktopCommandMap vs Rust handler', handlerCommands, typedCommands, violations);

const invokedCommands = new Set();
const listenedEvents = new Set();
for (const file of productionTypescript) {
  const source = await readFile(file, 'utf8');
  for (const command of extractLiteralCalls(source, 'invokeDesktop')) invokedCommands.add(command);
  for (const event of extractLiteralCalls(source, 'listenDesktopEvent')) listenedEvents.add(event);
  if (file !== runtimePath && /@tauri-apps\/api\/(?:core|event)/.test(source)) {
    violations.push(`${relative(file)}: direct core/event import; use desktopRuntime`);
  }
}
for (const command of invokedCommands) {
  if (!typedCommands.has(command)) violations.push(`invokeDesktop: untyped command ${command}`);
  if (!handlerCommands.has(command)) violations.push(`invokeDesktop: unregistered Rust command ${command}`);
}

const typedEvents = new Set(extractInterfaceKeys(desktopTypes, 'DesktopEventMap'));
const emittedEvents = new Set(rustSources.flatMap(extractRustEvents));
compareSets('DesktopEventMap vs Rust emit', emittedEvents, typedEvents, violations);
for (const event of listenedEvents) {
  if (!typedEvents.has(event)) violations.push(`listenDesktopEvent: untyped event ${event}`);
}

const routeMatrix = JSON.parse(routeMatrixSource);
const backendRoutes = new Set(routeMatrix.routes
  .filter(route => route.status === 'implemented')
  .map(route => routeKey(route.method, route.gin_path)));
const apiFiles = productionTypescript.filter(file => relative(file).startsWith('src/api/'));
let apiCallCount = 0;
for (const file of apiFiles) {
  const source = await readFile(file, 'utf8');
  for (const call of extractApiCalls(source)) {
    apiCallCount += 1;
    const key = routeKey(call.method, call.path);
    if (!backendRoutes.has(key)) violations.push(`${relative(file)}: backend route missing: ${key}`);
  }
}

if (violations.length > 0) {
  console.error('Desktop contract checks failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Desktop contracts passed: ${typedCommands.size} commands, ${typedEvents.size} events, ` +
  `${apiCallCount} API call sites.`,
);
