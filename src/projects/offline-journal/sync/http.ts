import type { SyncSettings } from "../stores/settingsStore";

export type HttpResponse = {
  status: number;
  ok: boolean;
  json: () => Promise<unknown>;
};

const TIMEOUT_MS = 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A ~30-line fetch client instead of the shared axios instance: the sync engine
 * needs the raw status code for every response (axios throws on non-2xx) and a
 * per-call base URL the user can change in Settings.
 *
 * `latencyMs` and `failureRate` are the fault-injection knobs from Settings —
 * they let you drive the 5xx/backoff paths on demand.
 */
export async function request(
  settings: SyncSettings,
  path: string,
  init: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<HttpResponse> {
  if (settings.latencyMs > 0) await sleep(settings.latencyMs);
  if (settings.failureRate > 0 && Math.random() < settings.failureRate) {
    return { status: 503, ok: false, json: async () => ({ injected: true }) };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `${settings.baseUrl.replace(/\/+$/, "")}${path}`,
      {
        method: init.method ?? "GET",
        body: init.body,
        headers: { accept: "application/json", ...init.headers },
        signal: controller.signal,
      },
    );
    return {
      status: response.status,
      ok: response.ok,
      json: () => response.json() as Promise<unknown>,
    };
  } finally {
    clearTimeout(timer);
  }
}
