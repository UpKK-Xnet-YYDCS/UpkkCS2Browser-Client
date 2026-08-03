export type DesktopUnlisten = () => void;
export type DesktopHttpFetch = typeof import('@tauri-apps/plugin-http').fetch;
let optionalHttpFetchPromise: Promise<DesktopHttpFetch | null> | null = null;

function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('module') ||
    message.includes('import') ||
    message.includes('Cannot find') ||
    message.includes('Failed to resolve');
}

export async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

export async function listenDesktopEvent<T>(
  event: string,
  handler: (payload: T) => void | Promise<void>,
): Promise<DesktopUnlisten> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, ({ payload }) => handler(payload));
}

export async function openExternalUrl(url: string): Promise<void> {
  const { open } = await import('@tauri-apps/plugin-shell');
  await open(url);
}

export async function getDesktopHttpFetch(): Promise<DesktopHttpFetch> {
  const { fetch } = await import('@tauri-apps/plugin-http');
  return fetch;
}

export function getOptionalDesktopHttpFetch(): Promise<DesktopHttpFetch | null> {
  optionalHttpFetchPromise ??= getDesktopHttpFetch().catch(error => {
    if (isModuleLoadError(error)) return null;
    throw error;
  });
  return optionalHttpFetchPromise;
}

export async function saveJsonWithDialog(
  defaultPath: string,
  title: string,
  contents: string,
): Promise<string | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }],
    title,
  });
  if (!path) return null;
  await invokeDesktop('write_text_file', { path, contents });
  return path;
}

export async function relaunchDesktopApp(): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}
