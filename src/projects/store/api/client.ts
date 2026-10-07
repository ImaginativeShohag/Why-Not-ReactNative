import sharedAxios from "@/src/shared/api/axios";
import { env } from "@/src/shared/constants/env";

import { storeConfig } from "../constants/config";

/**
 * Store-owned axios instances, derived from the shared (project-agnostic)
 * defaults. `create` on an instance inherits its timeout and headers but gets
 * its own interceptor chain, so the store's auth handling never leaks into
 * another project's requests.
 *
 * - `storeApi`   — the catalogue API (FakeStoreAPI by default), per-variant URL.
 * - `backendApi` — the optional companion backend (orders, payments, push).
 * - `authApi`    — login/refresh calls; no auth interceptors, so a failing
 *                  refresh can never recurse into another refresh.
 */
export const storeApi = sharedAxios.create({ baseURL: env.storeApiUrl });

export const backendApi = sharedAxios.create({
  baseURL: storeConfig.backendUrl || env.storeApiUrl,
});

export const authApi = sharedAxios.create({ baseURL: env.storeApiUrl });

export const authBackendApi = sharedAxios.create({
  baseURL: storeConfig.backendUrl || env.storeApiUrl,
});
