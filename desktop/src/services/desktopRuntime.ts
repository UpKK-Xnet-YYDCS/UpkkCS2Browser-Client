import type {
  DesktopCommandArgs,
  DesktopCommandName,
  DesktopCommandResult,
  DesktopEventMap,
  DesktopEventName,
} from '@/types/desktop';

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

type DesktopInvokeArguments<Name extends DesktopCommandName> =
  DesktopCommandArgs<Name> extends undefined
    ? [args?: undefined]
    : [args: DesktopCommandArgs<Name>];

export async function invokeDesktop<Name extends DesktopCommandName>(
  command: Name,
  ...[args]: DesktopInvokeArguments<Name>
): Promise<DesktopCommandResult<Name>> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<DesktopCommandResult<Name>>(command, args);
}

export async function listenDesktopEvent<Name extends DesktopEventName>(
  event: Name,
  handler: (payload: DesktopEventMap[Name]) => void | Promise<void>,
): Promise<DesktopUnlisten> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<DesktopEventMap[Name]>(event, ({ payload }) => handler(payload));
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
