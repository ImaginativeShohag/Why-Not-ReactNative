/**
 * Every session mutation (task batches, UI pause/resume, notification
 * actions, motion auto-pause) goes through this one promise chain. Two
 * read-modify-write cycles on the session row interleaving would silently
 * drop a pause or double-count a batch.
 */
let chain: Promise<unknown> = Promise.resolve();

export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.catch(() => undefined);
  return run;
}
