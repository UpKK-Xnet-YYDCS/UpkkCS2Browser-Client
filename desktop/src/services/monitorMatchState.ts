let now = () => Date.now();

const cooldownMap = new Map<string, number>();
const lastMatchedMapMap = new Map<string, string>();
const matchCounterMap = new Map<string, number>();
const lastNotifiedMapMap = new Map<string, string>();
const previousSeenMapMap = new Map<string, string>();

function keyOf(ruleId: string, serverKey: string): string {
  return ruleId + ':' + serverKey;
}

export function setMonitorMatchNow(nextNow: () => number): void {
  now = nextNow;
}

export function resetMonitorMatchState(): void {
  cooldownMap.clear();
  lastMatchedMapMap.clear();
  matchCounterMap.clear();
  lastNotifiedMapMap.clear();
  previousSeenMapMap.clear();
}

export function isCoolingDown(ruleId: string, serverKey: string, cooldownSeconds: number): boolean {
  const lastTime = cooldownMap.get(keyOf(ruleId, serverKey));
  if (!lastTime) return false;
  return (now() - lastTime) < cooldownSeconds * 1000;
}

export function setCooldown(ruleId: string, serverKey: string): void {
  cooldownMap.set(keyOf(ruleId, serverKey), now());
}

export function trackConsecutiveMatch(ruleId: string, serverKey: string, mapName: string): number {
  const key = keyOf(ruleId, serverKey);
  const prevMap = lastMatchedMapMap.get(key);
  if (prevMap !== mapName) {
    lastMatchedMapMap.set(key, mapName);
    matchCounterMap.set(key, 1);
    return 1;
  }
  const count = (matchCounterMap.get(key) || 0) + 1;
  matchCounterMap.set(key, count);
  return count;
}

export function resetConsecutiveMatch(ruleId: string, serverKey: string): void {
  const key = keyOf(ruleId, serverKey);
  matchCounterMap.delete(key);
  lastMatchedMapMap.delete(key);
}

export function isDuplicateNotification(ruleId: string, serverKey: string, mapName: string): boolean {
  const key = keyOf(ruleId, serverKey);
  const lastNotified = lastNotifiedMapMap.get(key);
  if (!lastNotified) return false;
  if (lastNotified !== mapName) return false;
  const prevSeen = previousSeenMapMap.get(key);
  if (!prevSeen || prevSeen === mapName) return true;
  return false;
}

export function setNotifiedMap(ruleId: string, serverKey: string, mapName: string): void {
  lastNotifiedMapMap.set(keyOf(ruleId, serverKey), mapName);
}

export function updatePreviousSeenMap(ruleId: string, serverKey: string, mapName: string): void {
  previousSeenMapMap.set(keyOf(ruleId, serverKey), mapName);
}

export function evaluateMatchGate(input: {
  ruleId: string;
  serverKey: string;
  mapName: string;
  requiredMatches: number;
  cooldownSeconds: number;
}): 'wait_consecutive' | 'cooldown' | 'duplicate' | 'notify' {
  const consecutiveCount = trackConsecutiveMatch(input.ruleId, input.serverKey, input.mapName);
  if (consecutiveCount < input.requiredMatches) return 'wait_consecutive';
  if (isCoolingDown(input.ruleId, input.serverKey, input.cooldownSeconds)) return 'cooldown';
  if (isDuplicateNotification(input.ruleId, input.serverKey, input.mapName)) return 'duplicate';
  return 'notify';
}

export function recordMatchNotification(ruleId: string, serverKey: string, mapName: string): void {
  setCooldown(ruleId, serverKey);
  setNotifiedMap(ruleId, serverKey, mapName);
}
