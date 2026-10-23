/**
 * A promise-chain mutex: tasks passed to `run` execute one at a time, in call
 * order. A failing task rejects its own caller but never blocks the next one.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(task, task);
      // Swallow on the chain only; the caller still sees the rejection.
      tail = result.catch(() => {});
      return result;
    },
  };
}
