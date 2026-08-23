export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(n => parseInt(n, 10) || 0);
  const partsB = b.split('.').map(n => parseInt(n, 10) || 0);

  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}

export function isNewerVersion(remote: string, current: string): boolean {
  return compareVersions(remote, current) > 0;
}

export function forceMandatoryIfBelowMinimum<T extends { mandatory?: boolean; min_version?: string }>(
  updateInfo: T,
  currentVersion: string,
): T {
  if (updateInfo.min_version && compareVersions(currentVersion, updateInfo.min_version) < 0) {
    updateInfo.mandatory = true;
  }
  return updateInfo;
}
