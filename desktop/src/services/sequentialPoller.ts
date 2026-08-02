export interface SequentialPoller {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createSequentialPoller(
  task: () => Promise<boolean | void>,
  intervalMs: number,
): SequentialPoller {
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (!running) return;
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, Math.max(0, intervalMs));
  };

  const run = async () => {
    if (!running) return;
    const shouldContinue = await task();
    if (running && shouldContinue !== false) schedule();
    else running = false;
  };

  return {
    start() {
      if (running) return;
      running = true;
      void run();
    },
    stop() {
      running = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    isRunning() {
      return running;
    },
  };
}
