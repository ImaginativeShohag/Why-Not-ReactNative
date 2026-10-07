/**
 * Crash + performance facade. No vendor SDK is installed; `setMonitoringAdapter`
 * plugs one in (e.g. Sentry: captureException → Sentry.captureException,
 * startSpan → Sentry.startInactiveSpan). Source-map upload is a build concern
 * handled by the vendor's EAS integration, not by this file.
 */
export type MonitoringContext = Record<string, unknown>;

export interface MonitoringAdapter {
  captureException: (error: unknown, context?: MonitoringContext) => void;
  captureMessage: (message: string, context?: MonitoringContext) => void;
  addBreadcrumb: (
    category: string,
    message: string,
    data?: MonitoringContext,
  ) => void;
  setUser: (user: { id: string } | null) => void;
  startSpan: (
    name: string,
    op: string,
  ) => { end: (data?: MonitoringContext) => void };
}

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const consoleAdapter: MonitoringAdapter = {
  captureException: (error, context) => {
    if (__DEV__) console.warn("[monitoring] exception", error, context ?? "");
  },
  captureMessage: (message, context) => {
    if (__DEV__) console.log("[monitoring] message", message, context ?? "");
  },
  addBreadcrumb: () => {
    // Breadcrumbs are only interesting attached to a real crash report.
  },
  setUser: () => {},
  startSpan: (name, op) => {
    const start = now();
    return {
      end: (data) => {
        if (__DEV__) {
          const ms = Math.round(now() - start);
          console.log(`[monitoring] span ${op}:${name} ${ms}ms`, data ?? "");
        }
      },
    };
  },
};

let adapter: MonitoringAdapter = consoleAdapter;

export const setMonitoringAdapter = (next: MonitoringAdapter) => {
  adapter = next;
};

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const monitoring = {
  captureException: (error: unknown, context?: MonitoringContext) =>
    safe(() => adapter.captureException(error, context), undefined),
  captureMessage: (message: string, context?: MonitoringContext) =>
    safe(() => adapter.captureMessage(message, context), undefined),
  addBreadcrumb: (
    category: string,
    message: string,
    data?: MonitoringContext,
  ) => safe(() => adapter.addBreadcrumb(category, message, data), undefined),
  setUser: (userId: number | null) =>
    safe(
      () => adapter.setUser(userId === null ? null : { id: String(userId) }),
      undefined,
    ),
  startSpan: (name: string, op = "task") =>
    safe(() => adapter.startSpan(name, op), { end: () => {} }),
  /** Times an async task and reports failures. */
  async trace<T>(name: string, op: string, task: () => Promise<T>): Promise<T> {
    const span = monitoring.startSpan(name, op);
    try {
      const result = await task();
      span.end({ ok: true });
      return result;
    } catch (error) {
      span.end({ ok: false });
      throw error;
    }
  },
};
