export function remainingCountdownSeconds(deadlineMs: number, nowMs: number): number {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function isDocumentHidden(doc: { hidden?: boolean } | null | undefined = globalThis.document): boolean {
  return Boolean(doc?.hidden);
}
