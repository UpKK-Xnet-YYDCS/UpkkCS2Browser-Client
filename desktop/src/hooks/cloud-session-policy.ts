export const cloudSessionResumeMs = 5 * 60 * 1000;
export type ActiveCloudSessions = Partial<Record<"assistant" | "chat", string>>;

export function recentCloudSessions(raw: string | null, now: number): ActiveCloudSessions {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (!saved || typeof saved.visitedAt !== "number" || now < saved.visitedAt || now - saved.visitedAt >= cloudSessionResumeMs) return {};
    const ids: ActiveCloudSessions = {};
    for (const mode of ["assistant", "chat"] as const) {
      const id = saved.activeIds?.[mode];
      if (typeof id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) ids[mode] = id;
    }
    return ids;
  } catch { return {}; }
}

// Unsent drafts are local to one view; sharing their IDs would make new tabs conflict.
export function savedCloudSessions(ids: ActiveCloudSessions, sessions: readonly {id: string}[]): ActiveCloudSessions {
  return Object.fromEntries(Object.entries(ids).filter(([, id]) => sessions.some(session => session.id === id)));
}
