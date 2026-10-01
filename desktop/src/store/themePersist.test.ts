import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyModeSurfaceColors,
  createResetTheme,
  defaultDarkColors,
  defaultLightColors,
  defaultTheme,
  loadThemeSettings,
  persistThemeSettings,
  resetColorRegionValue,
  THEME_STORAGE_KEY,
} from './themePersist.ts';

function installLocalStorage(setItem: (key: string, value: string) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { setItem },
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
}

test('persistThemeSettings writes the theme JSON under the existing key', (t) => {
  const writes: Array<[string, string]> = [];
  t.after(installLocalStorage((key, value) => { writes.push([key, value]); }));
  const theme = { ...defaultTheme, backgroundImage: 'data:image/png;base64,AAAA' };
  persistThemeSettings(theme);
  assert.deepEqual(writes, [[THEME_STORAGE_KEY, JSON.stringify(theme)]]);
  assert.equal(THEME_STORAGE_KEY, 'upkk-theme-settings');
});

test('persistThemeSettings logs instead of throwing when the quota is exceeded', (t) => {
  const errors: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => { errors.push(args); });
  t.after(installLocalStorage(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  }));
  assert.doesNotThrow(() => persistThemeSettings({ ...defaultTheme, backgroundImage: 'x'.repeat(1024) }));
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], 'Failed to save theme settings:');
});

test('loadThemeSettings returns the dark default when storage is empty or invalid', (t) => {
  t.mock.method(console, 'error', () => undefined);
  assert.equal(loadThemeSettings(null), defaultTheme);
  assert.equal(loadThemeSettings('').darkMode, true);
  assert.deepEqual(loadThemeSettings('{').colorRegions, defaultDarkColors);
});

test('loadThemeSettings merges stored regions onto the mode defaults', () => {
  const loaded = loadThemeSettings(JSON.stringify({
    darkMode: false,
    backgroundOpacity: 40,
    colorRegions: { primary: { r: 1, g: 2, b: 3, a: 1 } },
  }));
  assert.equal(loaded.darkMode, false);
  assert.equal(loaded.backgroundOpacity, 40);
  assert.deepEqual(loaded.colorRegions.primary, { r: 1, g: 2, b: 3, a: 1 });
  assert.deepEqual(loaded.colorRegions.header, defaultLightColors.header);
  assert.equal(loaded.backgroundImage, '');
  assert.equal(loaded.glassEffect, false);
});

test('loadThemeSettings treats missing darkMode as dark', () => {
  const loaded = loadThemeSettings(JSON.stringify({ backgroundImage: 'x.png' }));
  assert.equal(loaded.darkMode, true);
  assert.deepEqual(loaded.colorRegions, defaultDarkColors);
  assert.equal(loaded.backgroundImage, 'x.png');
});

test('switching modes only replaces surface colors', () => {
  const custom = {
    ...defaultDarkColors,
    primary: { r: 9, g: 8, b: 7, a: 1 },
    accent: { r: 4, g: 5, b: 6, a: 1 },
  };
  const light = applyModeSurfaceColors(custom, false);
  assert.deepEqual(light.primary, custom.primary);
  assert.deepEqual(light.secondary, custom.secondary);
  assert.deepEqual(light.accent, custom.accent);
  assert.deepEqual(light.header, defaultLightColors.header);
  assert.deepEqual(light.text, defaultLightColors.text);
});

test('reset keeps the default darkMode flag and only swaps palettes', () => {
  const reset = createResetTheme(false);
  assert.equal(reset.darkMode, true);
  assert.deepEqual(reset.colorRegions, defaultLightColors);
  assert.deepEqual(resetColorRegionValue(true, 'header'), defaultDarkColors.header);
});
