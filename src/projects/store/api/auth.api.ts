import * as Crypto from "expo-crypto";

import { hasBackend } from "../constants/config";
import type {
  AuthProvider,
  AuthResult,
  LoginPayload,
  SessionTokens,
  SignUpPayload,
} from "../models/Auth";
import { getDevFlags } from "../utils/devFlags";
import { authApi, authBackendApi } from "./client";
import { ApiError } from "./errors";
import { delay } from "./mockServer";

/*
 Naming rule of thumb:
   GET → fetchX · POST (create) → createX or an action verb · PUT/PATCH → updateX · DELETE → deleteX
*/

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

/**
 * FakeStoreAPI issues a single JWT and has no refresh endpoint. Against it we
 * mint a device-local refresh token so the refresh machinery is real on the
 * client even though the "server" side is simulated (see `refreshTokens`).
 * With a companion backend configured, both tokens come from the server.
 */
const localRefreshToken = () => `local-refresh.${Crypto.randomUUID()}`;

export async function loginUser(
  credentials: LoginPayload,
): Promise<AuthResult> {
  if (hasBackend()) {
    const { data } = await authBackendApi.post<AuthResult>(
      "/auth/login",
      credentials,
      { skipAuthRefresh: true },
    );
    return data;
  }

  const { data } = await authApi.post<{ token: string }>(
    "/auth/login",
    credentials,
    { skipAuthRefresh: true },
  );
  const payload = decodeJwtPayload(data.token);
  const id = typeof payload?.sub === "number" ? payload.sub : 1;
  return {
    accessToken: data.token,
    refreshToken: localRefreshToken(),
    user: {
      id,
      username:
        typeof payload?.user === "string" ? payload.user : credentials.username,
      provider: "password",
    },
  };
}

export async function registerUser(input: SignUpPayload): Promise<AuthResult> {
  if (hasBackend()) {
    const { data } = await authBackendApi.post<AuthResult>(
      "/auth/register",
      input,
      { skipAuthRefresh: true },
    );
    return data;
  }

  // FakeStoreAPI accepts the POST and returns an id, but does not persist the
  // user — so it can't sign in with these credentials afterwards. The session
  // is therefore minted locally and clearly marked as a demo token.
  const { data } = await authApi.post<{ id: number }>("/users", input, {
    skipAuthRefresh: true,
  });
  return {
    accessToken: `demo-access.${Crypto.randomUUID()}`,
    refreshToken: localRefreshToken(),
    user: {
      id: data.id,
      username: input.username,
      email: input.email,
      provider: "password",
    },
  };
}

/**
 * The call the refresh coordinator wraps. With a backend: POST the refresh
 * token, receive a rotated pair. Without one: a dev simulation that "rotates"
 * the pair locally after a realistic delay, and can be told to fail via the
 * dev menu to exercise logout-on-refresh-failure.
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<SessionTokens> {
  if (hasBackend()) {
    const { data } = await authBackendApi.post<SessionTokens>(
      "/auth/refresh",
      { refreshToken },
      { skipAuthRefresh: true },
    );
    return data;
  }

  await delay(400);
  const flags = getDevFlags();
  if (flags.failNextRefresh) {
    flags.set({ failNextRefresh: false });
    throw new ApiError({
      kind: "unauthorized",
      status: 401,
      message: "Refresh token rejected (dev menu).",
    });
  }
  return {
    accessToken: `refreshed-access.${Crypto.randomUUID()}`,
    refreshToken: localRefreshToken(),
  };
}

export type SocialExchangeInput = {
  provider: Exclude<AuthProvider, "password">;
  /** OIDC id token from Apple/Google — verified server-side, never trusted here. */
  idToken: string;
  /** Apple only returns the name/email on the very first authorisation. */
  email?: string | null;
  displayName?: string | null;
  /** PKCE code + verifier when the provider returned a code instead of a token. */
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
};

/**
 * Account-linking rule (enforced by the backend, never by the client):
 * an incoming social identity is matched by its provider subject first, then
 * by VERIFIED email. If the email belongs to an existing account created with
 * a different provider, the server answers 409 `account_exists` and the
 * client asks the user to sign in with the original method once, after which
 * the new provider is linked. Silently merging on an unverified email would
 * let anyone who registers that address at a provider take over the account.
 */
export async function exchangeSocialToken(
  input: SocialExchangeInput,
): Promise<AuthResult> {
  if (hasBackend()) {
    const { data } = await authBackendApi.post<AuthResult>(
      `/auth/social/${input.provider}`,
      input,
      { skipAuthRefresh: true },
    );
    return data;
  }

  // No backend: a clearly-labelled demo session so the flow is exercisable.
  const payload = decodeJwtPayload(input.idToken);
  const email =
    input.email ??
    (typeof payload?.email === "string" ? payload.email : undefined);
  return {
    accessToken: `demo-${input.provider}.${Crypto.randomUUID()}`,
    refreshToken: localRefreshToken(),
    user: {
      id: 1,
      username: email?.split("@")[0] ?? `${input.provider}-user`,
      email,
      displayName: input.displayName ?? undefined,
      provider: input.provider,
    },
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (hasBackend()) {
    await authBackendApi.post(
      "/auth/forgot",
      { email },
      { skipAuthRefresh: true },
    );
    return;
  }
  // Simulated: the real endpoint emails a universal link back into the app.
  await delay(600);
}

export async function revokeSession(
  refreshToken: string | null,
): Promise<void> {
  if (!hasBackend() || !refreshToken) return;
  try {
    await authBackendApi.post(
      "/auth/logout",
      { refreshToken },
      { skipAuthRefresh: true },
    );
  } catch {
    // Best effort: local sign-out must succeed even offline.
  }
}
