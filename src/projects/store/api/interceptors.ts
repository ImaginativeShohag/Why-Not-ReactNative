import {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { ApiError, toApiError } from "./errors";
import type { RefreshCoordinator } from "./refreshCoordinator";

type RetriableConfig = InternalAxiosRequestConfig & {
  _isRetry?: boolean;
  /** Opt out for endpoints that must never trigger a refresh (login, refresh itself). */
  skipAuthRefresh?: boolean;
};

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

export type StoreInterceptorOptions = {
  /** Synchronous read of the in-memory access token. */
  getAccessToken: () => string | null;
  coordinator: RefreshCoordinator;
  /** Called once when a refresh fails: clear tokens and route to sign-in. */
  onAuthFailure: () => void;
  /**
   * Dev menu hook: when it returns true, the first attempt of every request is
   * answered with a synthetic 401 without touching the network, so the refresh
   * path is exercisable against FakeStoreAPI (which never returns 401).
   */
  shouldForceUnauthorized?: () => boolean;
};

const forcedUnauthorizedAdapter = (config: InternalAxiosRequestConfig) =>
  Promise.reject(
    new AxiosError(
      "Forced 401 (dev menu)",
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      {
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Forced 401 (dev menu)" },
        headers: {},
        config,
      },
    ),
  );

const withBearer = (config: InternalAxiosRequestConfig, token: string) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
  return config;
};

/**
 * Installs the store's auth handling onto a store-owned axios instance (never
 * onto the shared one — the journal and podcast projects have no session).
 * Returns an eject function.
 *
 *   on 401:
 *     if request already retried → give up, sign out
 *     token = await coordinator.refresh()   (single-flight)
 *     retry the original request once with the new token
 */
export function installStoreInterceptors(
  instance: AxiosInstance,
  options: StoreInterceptorOptions,
): () => void {
  const requestId = instance.interceptors.request.use((config) => {
    const retriable = config as RetriableConfig;
    const token = options.getAccessToken();
    // A replay already carries the token the refresh just returned.
    if (token && !retriable._isRetry) withBearer(config, token);

    if (
      options.shouldForceUnauthorized?.() &&
      !retriable._isRetry &&
      !retriable.skipAuthRefresh
    ) {
      config.adapter = forcedUnauthorizedAdapter;
    }
    return config;
  });

  const responseId = instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const apiError = toApiError(error);
      const config = (error as AxiosError | undefined)?.config as
        RetriableConfig | undefined;

      if (apiError.kind !== "unauthorized" || !config) throw apiError;
      if (config.skipAuthRefresh) throw apiError;

      if (config._isRetry) {
        // Refreshed and still 401 — the session is genuinely invalid.
        options.onAuthFailure();
        throw apiError;
      }

      let token: string;
      try {
        token = await options.coordinator.refresh();
      } catch (refreshError) {
        options.onAuthFailure();
        throw new ApiError({
          kind: "unauthorized",
          status: 401,
          message: "Your session has expired. Please sign in again.",
          cause: refreshError,
        });
      }

      const retryConfig: RetriableConfig = { ...config, _isRetry: true };
      // A forced adapter must not leak into the replay.
      delete retryConfig.adapter;
      return instance.request(withBearer(retryConfig, token));
    },
  );

  return () => {
    instance.interceptors.request.eject(requestId);
    instance.interceptors.response.eject(responseId);
  };
}
