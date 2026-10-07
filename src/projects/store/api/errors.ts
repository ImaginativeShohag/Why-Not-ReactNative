import { isAxiosError, isCancel } from "axios";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "cancelled"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "validation"
  | "rateLimited"
  | "server"
  | "unknown";

/**
 * The one error shape screens deal with. Every rejected store request is
 * normalised into this, so UI code switches on `kind` and shows `message`
 * without knowing about axios, status codes, or FakeStoreAPI's plain-text
 * bodies.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly cause?: unknown;

  constructor(options: {
    kind: ApiErrorKind;
    message: string;
    status?: number;
    code?: string;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.cause = options.cause;
  }

  /** Worth retrying automatically (TanStack Query `retry`). */
  get isTransient() {
    return (
      this.kind === "network" ||
      this.kind === "timeout" ||
      this.kind === "server" ||
      this.kind === "rateLimited"
    );
  }
}

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Cannot reach the server. Please check your connection.",
  timeout: "The server took too long to respond. Please try again.",
  cancelled: "The request was cancelled.",
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You don't have access to this.",
  notFound: "We couldn't find what you were looking for.",
  conflict: "This conflicts with an existing record.",
  validation: "Some of the details you entered aren't valid.",
  rateLimited: "Too many attempts. Please wait a moment.",
  server: "Something went wrong on our side. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

const kindForStatus = (status: number): ApiErrorKind => {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rateLimited";
  if (status >= 500) return "server";
  return "unknown";
};

/** Picks a server-supplied message if there is one we can safely show. */
const serverMessage = (data: unknown): string | undefined => {
  // FakeStoreAPI answers with plain text, e.g. "username or password is incorrect".
  if (typeof data === "string") {
    const trimmed = data.trim();
    // Never surface an HTML error page to the user.
    return trimmed && !trimmed.startsWith("<") && trimmed.length < 200
      ? trimmed
      : undefined;
  }
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
};

const serverCode = (data: unknown): string | undefined => {
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isCancel(error)) {
    return new ApiError({
      kind: "cancelled",
      message: DEFAULT_MESSAGES.cancelled,
      cause: error,
    });
  }

  if (isAxiosError(error)) {
    if (error.response) {
      const { status, data } = error.response;
      const kind = kindForStatus(status);
      return new ApiError({
        kind,
        status,
        code: serverCode(data),
        message: serverMessage(data) ?? DEFAULT_MESSAGES[kind],
        cause: error,
      });
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError({
        kind: "timeout",
        message: DEFAULT_MESSAGES.timeout,
        cause: error,
      });
    }
    return new ApiError({
      kind: "network",
      message: DEFAULT_MESSAGES.network,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      kind: "unknown",
      message: error.message || DEFAULT_MESSAGES.unknown,
      cause: error,
    });
  }

  return new ApiError({
    kind: "unknown",
    message: DEFAULT_MESSAGES.unknown,
    cause: error,
  });
}

/** Maps anything thrown to a user-facing message (or null when there's no error). */
export const getErrorMessage = (error: unknown): string | null =>
  error ? toApiError(error).message : null;
