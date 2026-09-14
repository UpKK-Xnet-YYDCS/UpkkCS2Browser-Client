const EMPTY = Symbol('persist-serial-empty');

export function createLatestSerialWriter<T>(write: (value: T) => Promise<void> | void): (value: T) => Promise<void> {
  let latest: T | typeof EMPTY = EMPTY;
  let chain = Promise.resolve();

  return (value: T) => {
    latest = value;
    chain = chain
      .then(async () => {
        if (latest === EMPTY) return;
        const next = latest;
        latest = EMPTY;
        await write(next as T);
      })
      .catch(() => undefined);
    return chain;
  };
}
