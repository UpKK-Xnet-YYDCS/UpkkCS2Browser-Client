// Each Node test worker receives its own browser storage. Never use Node's
// experimental disk-backed localStorage or a developer's persisted settings.
const entries = new Map();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() { return entries.size; },
    key(index) { return [...entries.keys()][index] ?? null; },
    getItem(key) { return entries.get(String(key)) ?? null; },
    setItem(key, value) { entries.set(String(key), String(value)); },
    removeItem(key) { entries.delete(String(key)); },
    clear() { entries.clear(); },
  },
});
