type HttpFetch = (input: string, init?: RequestInit) => Promise<Response>;

let testHttpFetch: HttpFetch | null = null;

export function setApiHttpFetchForTests(fetchImpl: HttpFetch | null): void {
  testHttpFetch = fetchImpl;
}

export async function apiHttpFetch(url: string, init?: RequestInit): Promise<Response> {
  if (testHttpFetch) return testHttpFetch(url, init);
  const { getOptionalDesktopHttpFetch } = await import('../services/desktopRuntime.ts');
  const tauriFetch = await getOptionalDesktopHttpFetch();
  if (tauriFetch) return tauriFetch(url, init);
  return fetch(url, init);
}
