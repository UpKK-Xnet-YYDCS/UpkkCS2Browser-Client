export function extractRustHandlerCommands(source) {
  const handler = source.match(/tauri::generate_handler!\s*\[([\s\S]*?)\]\s*\)/)?.[1] ?? '';
  return [...handler.matchAll(/(?:\w+::)+([A-Za-z_][A-Za-z0-9_]*)/g)]
    .map(match => match[1]);
}

export function extractRustEvents(source) {
  return [...source.matchAll(/\.emit\(\s*["']([^"']+)["']/g)]
    .map(match => match[1]);
}

export function extractInterfaceKeys(source, interfaceName) {
  const declaration = source.search(new RegExp(`export interface ${interfaceName}\\s*\\{`));
  if (declaration < 0) return [];
  const start = source.indexOf('{', declaration);
  let depth = 0;
  let end = start;
  for (; end < source.length; end += 1) {
    if (source[end] === '{') depth += 1;
    if (source[end] === '}') depth -= 1;
    if (depth === 0) break;
  }
  const body = source.slice(start + 1, end);
  const keys = [];
  let nestedDepth = 0;
  for (const line of body.split(/\r?\n/)) {
    if (nestedDepth === 0) {
      const match = line.match(/^\s*(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\s*:/);
      if (match) keys.push(match[1] ?? match[2]);
    }
    nestedDepth += (line.match(/\{/g) ?? []).length;
    nestedDepth -= (line.match(/\}/g) ?? []).length;
  }
  return keys;
}

export function extractLiteralCalls(source, functionName) {
  const expression = new RegExp(`\\b${functionName}(?:<[^;()]*>)?\\(\\s*['\\"]([^'\\"]+)['\\"]`, 'g');
  return [...source.matchAll(expression)].map(match => match[1]);
}

export function normalizeRoutePath(route) {
  let normalized = route.split('?', 1)[0];
  normalized = normalized.replace(/\$\{[^}]*query[^}]*\}$/i, '');
  normalized = normalized.replace(/\$\{[^}]+\}/g, ':param');
  normalized = normalized.replace(/\{[^}]+\}|:[^/]+|\*[^/]+/g, ':param');
  normalized = normalized.replace(/\/+$/, '') || '/';
  return normalized;
}

export function extractApiCalls(source) {
  const calls = [];
  const expression = /\b(fetchApi|fetchWithRetry|refreshEndpoint)(?:<[^;()]*>)?\(\s*([`'"])(\/api\/[\s\S]*?)\2\s*(?:,\s*(\{[\s\S]*?\}))?\s*\)/g;
  for (const match of source.matchAll(expression)) {
    const method = match[4]?.match(/\bmethod\s*:\s*['"]([A-Za-z]+)['"]/)?.[1] ?? 'GET';
    calls.push({
      method: method.toUpperCase(),
      path: normalizeRoutePath(match[3]),
    });
  }
  return calls;
}

export function routeKey(method, route) {
  return `${method.toUpperCase()} ${normalizeRoutePath(route)}`;
}
