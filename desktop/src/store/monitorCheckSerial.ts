/**
 * Orders monitor checks across monitoring runs (start, stop, restart, interval
 * change). Every run boundary starts a new generation: a check that belongs to
 * an older generation is stale and must not auto-join, notify or publish its
 * results. A check never starts while an earlier one is still in flight, so two
 * checks cannot both count one observation in the consecutive-match gate.
 */
export interface MonitorCheckSerial {
  /** Marks every check started so far as stale and returns the new generation. */
  nextGeneration: () => number;
  /**
   * Runs `check` once the previously started check has settled; skips it when
   * its generation went stale while waiting. Rejections reach the caller but
   * never block later checks.
   */
  run: (generation: number, check: (isStale: () => boolean) => Promise<void>) => Promise<void>;
}

const settled = () => undefined;

export function createMonitorCheckSerial(): MonitorCheckSerial {
  let generation = 0;
  let inFlight: Promise<void> = Promise.resolve();
  return {
    nextGeneration() {
      generation += 1;
      return generation;
    },
    run(owner, check) {
      const isStale = () => owner !== generation;
      const run = inFlight.then(() => (isStale() ? undefined : check(isStale)));
      inFlight = run.then(settled, settled);
      return run;
    },
  };
}
