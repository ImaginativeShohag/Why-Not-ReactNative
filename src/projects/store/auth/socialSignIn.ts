import * as AppleAuthentication from "expo-apple-authentication";
import { exchangeCodeAsync } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Platform } from "react-native";

import { exchangeSocialToken } from "../api/auth.api";
import { ApiError } from "../api/errors";
import { storeConfig } from "../constants/config";
import type { AuthResult } from "../models/Auth";

// Closes the auth popup/tab and hands the redirect back to the waiting
// promptAsync(). Must run at module scope of a module that is loaded when the
// redirect lands. No-op on native.
WebBrowser.maybeCompleteAuthSession();

/**
 * Every social flow resolves to one of these — never throws for a user
 * cancel, so the sign-in screen can always return to a clean idle state
 * instead of leaving a spinner running.
 */
export type SocialResult =
  | { type: "success"; result: AuthResult }
  | { type: "cancel" }
  | { type: "error"; message: string };

/*
 * Account linking (the rule; enforcement lives on the backend — see
 * `exchangeSocialToken` in auth.api.ts):
 *   1. Match the provider subject (Apple `user`, Google `sub`) → same account.
 *   2. Else match a VERIFIED email → the server replies 409 `account_exists`;
 *      we ask the user to sign in with the original method once, then link.
 *   3. Else create a new account.
 * Apple's private-relay emails are distinct addresses, so rule 2 rarely
 * fires for "Hide My Email" users — that's expected, not a bug.
 */

// ---------------------------------------------------------------- Apple

export async function isAppleSignInAvailable() {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<SocialResult> {
  try {
    // A hashed nonce binds the identity token to this request (replay protection).
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) {
      return {
        type: "error",
        message: "Apple didn't return an identity token.",
      };
    }
    // Apple sends name/email only on the FIRST authorisation; forward them now
    // or they are gone for good.
    const displayName = credential.fullName
      ? AppleAuthentication.formatFullName(credential.fullName)
      : null;
    const result = await exchangeSocialToken({
      provider: "apple",
      idToken: credential.identityToken,
      email: credential.email,
      displayName: displayName || null,
      code: credential.authorizationCode ?? undefined,
    });
    return { type: "success", result };
  } catch (error) {
    return appleFailure(error);
  }
}

/**
 * Native Apple errors carry a code like `ERR_REQUEST_UNKNOWN` and a message
 * with Swift file names — never show that. ASAuthorizationError.unknown is
 * what iOS reports when the sheet is dismissed with no Apple Account signed
 * in (common on simulators), so it gets a hint rather than a raw error.
 */
function appleFailure(error: unknown): SocialResult {
  if (error instanceof ApiError) {
    // From our own token exchange: already a user-facing message.
    return { type: "error", message: error.message };
  }
  const code = (error as { code?: string })?.code;
  if (code === "ERR_REQUEST_CANCELED") return { type: "cancel" };
  if (code === "ERR_REQUEST_UNKNOWN") {
    return {
      type: "error",
      message:
        "Apple sign-in didn't finish. Check that you're signed in to an Apple Account in Settings, then try again.",
    };
  }
  return {
    type: "error",
    message: "Apple sign-in failed. Please try again.",
  };
}

// ---------------------------------------------------------------- Google

const googleClientIdForPlatform = () =>
  Platform.select({
    ios: storeConfig.googleIosClientId,
    android: storeConfig.googleAndroidClientId,
    default: storeConfig.googleWebClientId,
  }) ?? "";

export const isGoogleConfigured = () => googleClientIdForPlatform().length > 0;

// The Google provider asserts a client id for the current platform at hook
// time. When none is configured we pass an inert placeholder so the hook can
// still be called unconditionally (rules of hooks) — `available` is false and
// the button is never shown, so it is never prompted.
const PLACEHOLDER_CLIENT_ID = "google-sign-in-disabled";

/**
 * Google via expo-auth-session: authorization-code flow with PKCE (the
 * default), then a code exchange carrying the verifier. No client secret
 * ever ships in the app.
 */
export function useGoogleSignIn() {
  const available = isGoogleConfigured();
  const clientIds = {
    iosClientId: storeConfig.googleIosClientId || PLACEHOLDER_CLIENT_ID,
    androidClientId: storeConfig.googleAndroidClientId || PLACEHOLDER_CLIENT_ID,
    webClientId: storeConfig.googleWebClientId || PLACEHOLDER_CLIENT_ID,
  };
  const [request, , promptAsync] = Google.useAuthRequest({
    ...clientIds,
    scopes: ["openid", "profile", "email"],
    // We exchange ourselves so the whole flow is one awaited function.
    shouldAutoExchangeCode: false,
    selectAccount: true,
  });
  const signIn = useCallback(async (): Promise<SocialResult> => {
    if (!available || !request) {
      return { type: "error", message: "Google sign-in isn't configured." };
    }
    try {
      const result = await promptAsync();
      if (
        result.type === "cancel" ||
        result.type === "dismiss" ||
        result.type === "locked"
      ) {
        return { type: "cancel" };
      }
      if (result.type !== "success" || !result.params.code) {
        return { type: "error", message: "Google sign-in didn't complete." };
      }
      const tokens = await exchangeCodeAsync(
        {
          clientId: googleClientIdForPlatform(),
          code: result.params.code,
          redirectUri: request.redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? "" },
        },
        Google.discovery,
      );
      if (!tokens.idToken) {
        return {
          type: "error",
          message: "Google didn't return an identity token.",
        };
      }
      const session = await exchangeSocialToken({
        provider: "google",
        idToken: tokens.idToken,
      });
      return { type: "success", result: session };
    } catch (error) {
      return {
        type: "error",
        message:
          error instanceof Error ? error.message : "Google sign-in failed.",
      };
    }
  }, [available, request, promptAsync]);

  return { available: available && !!request, signIn };
}
