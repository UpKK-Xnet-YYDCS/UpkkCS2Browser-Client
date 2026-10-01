import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDesktopHttpFetch,
  getOptionalDesktopHttpFetch,
  isDesktopRuntime,
  releaseResponseBody,
} from './desktopRuntime.ts';
import { hasStoredCredentials } from './secureStorage.ts';

function trackedResponse(status: number): { response: Response; cancelled: () => number } {
  let cancels = 0;
  const body = new ReadableStream<Uint8Array>({
    pull() {
      // Never produces data: like an unread plugin-http body.
    },
    cancel() {
      cancels += 1;
    },
  });
  return { response: new Response(body, { status }), cancelled: () => cancels };
}

test('releaseResponseBody cancels a body the caller will not read', async () => {
  const { response, cancelled } = trackedResponse(500);
  await releaseResponseBody(response);
  assert.equal(cancelled(), 1);
  assert.equal(response.status, 500);
});

test('releaseResponseBody tolerates null and locked bodies', async () => {
  await releaseResponseBody(new Response(null, { status: 204 }));
  const { response, cancelled } = trackedResponse(502);
  response.body?.getReader();
  await releaseResponseBody(response);
  assert.equal(cancelled(), 0);
});

test('browser preview avoids IPC and uses the existing HTTP fallback signal', async () => {
  assert.equal(isDesktopRuntime(), false);
  assert.equal(await getOptionalDesktopHttpFetch(), null);
  assert.equal(await hasStoredCredentials(), false);
  await assert.rejects(getDesktopHttpFetch(), /Tauri HTTP module is unavailable/);
});

test('desktop runtime still loads the native transport and checks encrypted credentials', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const commands: string[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { __TAURI_INTERNALS__: { invoke: async (command: string) => {
      commands.push(command);
      return true;
    } } },
  });
  try {
    assert.equal(isDesktopRuntime(), true);
    assert.equal(await hasStoredCredentials(), true);
    const nativeFetch = await getDesktopHttpFetch();
    assert.equal(typeof nativeFetch, 'function');
    assert.notEqual(nativeFetch, globalThis.fetch);
    assert.equal(await getOptionalDesktopHttpFetch(), nativeFetch);
    assert.deepEqual(commands, ['has_stored_credentials']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
  assert.equal(await getOptionalDesktopHttpFetch(), null);
});
