/**
 * Single-flight token refresh.
 *
 * Five requests fire in parallel and all five get a 401. A naive interceptor
 * performs five refreshes; with rotating refresh tokens, four of them
 * invalidate the token the fifth just obtained and the user is logged out
 * for no reason. The whole trick: while a refresh is in flight, every caller
 * awaits the *same* promise.
 */
export type RefreshFn = () => Promise<string>;

export type RefreshCoordinator = {
  /** Resolves with a fresh access token; concurrent callers share one call. */
  refresh: () => Promise<string>;
  /** Swap the underlying refresh implementation (sign-in wires the real one). */
  setRefreshFn: (fn: RefreshFn) => void;
  /** How many refreshes actually hit the network — the M2 checkpoint metric. */
  readonly refreshCount: number;
  resetStats: () => void;
};

export function createRefreshCoordinator(
  initial: RefreshFn = () => Promise.reject(new Error("No refresh configured")),
): RefreshCoordinator {
  let refreshFn = initial;
  let inFlight: Promise<string> | null = null;
  let count = 0;

  return {
    refresh() {
      if (inFlight) return inFlight;
      count += 1;
      inFlight = refreshFn().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    setRefreshFn(fn) {
      refreshFn = fn;
    },
    get refreshCount() {
      return count;
    },
    resetStats() {
      count = 0;
    },
  };
}

/** The store's app-wide coordinator. SessionProvider sets its refresh function. */
export const refreshCoordinator = createRefreshCoordinator();
