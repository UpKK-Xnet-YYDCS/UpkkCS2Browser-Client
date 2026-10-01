export interface ServerFetchTicket {
  version: number;
  abort: AbortController;
}

export interface ServerFetchGate {
  /**
   * Starts a server-list request, invalidating and aborting the previous one.
   * Returns null for a silent (background) refresh while a user-driven fetch is
   * still pending: the refresh must neither supersede nor abort it.
   */
  begin: (silent: boolean) => ServerFetchTicket | null;
  /** True while no newer request has started. */
  isLatest: (version: number) => boolean;
  /** Marks the request as settled (success, failure, abort or stale). */
  finish: (version: number) => void;
}

export function createServerFetchGate(versionRef: { current: number }): ServerFetchGate {
  let activeAbort: AbortController | null = null;
  let pendingUserVersion: number | null = null;

  return {
    begin(silent) {
      if (silent && pendingUserVersion !== null) return null;
      versionRef.current += 1;
      const version = versionRef.current;
      if (!silent) pendingUserVersion = version;
      activeAbort?.abort();
      const abort = new AbortController();
      activeAbort = abort;
      return { version, abort };
    },
    isLatest(version) {
      return versionRef.current === version;
    },
    finish(version) {
      if (pendingUserVersion === version) pendingUserVersion = null;
    },
  };
}
