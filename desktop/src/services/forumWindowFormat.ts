export function formatForumWindowError(
  error: unknown,
  labels: { tauriNotDetected: string; openForumFailedMsg: string },
): string {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes('module') || errMsg.includes('import') || errMsg.includes('Cannot find')) {
    return labels.tauriNotDetected;
  }
  return labels.openForumFailedMsg + ': ' + errMsg;
}

