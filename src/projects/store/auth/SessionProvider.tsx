import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  loginUser,
  refreshTokens,
  registerUser,
  revokeSession,
} from "../api/auth.api";
import { backendApi, storeApi } from "../api/client";
import { installStoreInterceptors } from "../api/interceptors";
import { refreshCoordinator } from "../api/refreshCoordinator";
import { useCheckoutStore } from "../checkout/checkoutStore";
import type {
  AuthResult,
  LoginPayload,
  SessionUser,
  SignUpPayload,
} from "../models/Auth";
import { unregisterForPushAsync } from "../notifications/registerForPush";
import { clearUserScopedCache } from "../query/storeQuery";
import { useCartStore } from "../stores/cartStore";
import {
  reconcileCartOnSignIn,
  startCartAutoSync,
  stopCartAutoSync,
} from "../stores/cartSync";
import { useSearchStore } from "../stores/searchStore";
import { identify, track } from "../utils/analytics";
import { getDevFlags } from "../utils/devFlags";
import { monitoring } from "../utils/monitoring";
import { authenticateWithBiometrics, isBiometricAvailable } from "./biometrics";
import {
  type SessionContextValue,
  SessionContext,
  type SessionStatus,
} from "./sessionContext";
import {
  clearTokens,
  clearUser,
  getAccessToken,
  loadBiometricPreference,
  loadGuest,
  loadOnboarded,
  loadRefreshToken,
  loadTokens,
  loadUser,
  saveBiometricPreference,
  saveGuest,
  saveOnboarded,
  saveTokens,
  saveUser,
} from "./tokenStorage";

/*
 * Interceptors are installed once per JS runtime onto the store's own axios
 * instances. The auth-failure callback is a late-bound ref because the
 * provider (which owns sign-out) mounts after this module is evaluated.
 */
let onAuthFailure: () => void = () => {};
let interceptorsInstalled = false;

function installInterceptorsOnce() {
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;
  const options = {
    getAccessToken,
    coordinator: refreshCoordinator,
    onAuthFailure: () => onAuthFailure(),
    shouldForceUnauthorized: () => getDevFlags().forceUnauthorized,
  };
  installStoreInterceptors(storeApi, options);
  installStoreInterceptors(backendApi, options);

  refreshCoordinator.setRefreshFn(async () => {
    const refreshToken = await loadRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");
    const tokens = await refreshTokens(refreshToken);
    // Persist BEFORE resolving so every queued request replays with it.
    await saveTokens(tokens);
    return tokens.accessToken;
  });
}

type State = {
  status: SessionStatus;
  user: SessionUser | null;
  onboarded: boolean;
  locked: boolean;
  biometricEnabled: boolean;
};

/**
 * The only owner of session state. Everything else reads it through
 * `useSession()`; nothing else touches the keychain.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    status: "loading",
    user: null,
    onboarded: false,
    locked: false,
    biometricEnabled: false,
  });
  const signingOut = useRef(false);

  // Boot: read keychain + flags, decide the initial status.
  useEffect(() => {
    installInterceptorsOnce();
    let cancelled = false;
    (async () => {
      const span = monitoring.startSpan("session.restore", "boot");
      try {
        const [tokens, user, onboarded, guest, biometric] = await Promise.all([
          loadTokens(),
          loadUser(),
          loadOnboarded(),
          loadGuest(),
          loadBiometricPreference(),
        ]);
        if (cancelled) return;
        const signedIn = !!tokens && !!user;
        if (signedIn) {
          identify(user.id);
          monitoring.setUser(user.id);
        }
        setState({
          status: signedIn ? "signedIn" : guest ? "guest" : "signedOut",
          user: signedIn ? user : null,
          onboarded,
          locked: signedIn && biometric,
          biometricEnabled: biometric,
        });
      } catch (error) {
        // A corrupt keychain entry must not brick the store: start signed out.
        monitoring.captureException(error, { area: "session.restore" });
        if (!cancelled) {
          setState((s) => ({ ...s, status: "signedOut" }));
        }
      } finally {
        span.end();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const establish = useCallback(async (result: AuthResult) => {
    await saveTokens(result);
    await saveUser(result.user);
    await saveGuest(false);
    identify(result.user.id);
    monitoring.setUser(result.user.id);
    setState((s) => ({
      ...s,
      status: "signedIn",
      user: result.user,
      locked: false,
    }));
    // Don't block navigation on the merge; it updates the bag when done.
    reconcileCartOnSignIn(result.user.id);
  }, []);

  const signIn = useCallback(
    async (credentials: LoginPayload) => {
      const result = await loginUser(credentials);
      await establish(result);
      track("sign_in", { method: "password" });
    },
    [establish],
  );

  const signUp = useCallback(
    async (input: SignUpPayload) => {
      const result = await registerUser(input);
      await establish(result);
      track("sign_up", { method: "password" });
    },
    [establish],
  );

  const completeSignIn = useCallback(
    async (result: AuthResult, method: "apple" | "google") => {
      await establish(result);
      track("sign_in", { method });
    },
    [establish],
  );

  const signOut = useCallback(async (reason: "user" | "expired" = "user") => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      const refreshToken = await loadRefreshToken().catch(() => null);
      await Promise.allSettled([
        revokeSession(refreshToken),
        unregisterForPushAsync(),
      ]);
      await clearTokens();
      await clearUser();
      // Cached PII failure mode: the next person on this device must not see
      // the previous user's orders, wishlist, profile, bag, checkout address
      // or searches.
      clearUserScopedCache();
      // Stop first, or clearing the local bag would empty the server cart.
      stopCartAutoSync();
      useCartStore.getState().clearCart();
      useCheckoutStore.getState().send({ type: "RESET" });
      useCheckoutStore.getState().forgetSavedAddress();
      useSearchStore.getState().clearRecents();
      identify(null);
      monitoring.setUser(null);
      track("sign_out", {});
      if (reason === "expired") {
        monitoring.addBreadcrumb("auth", "Signed out after refresh failure");
      }
      // Stack.Protected reacts to this: the (app) group becomes unavailable
      // and the router moves to /sign-in on its own.
      setState((s) => ({
        ...s,
        status: "signedOut",
        user: null,
        locked: false,
      }));
    } finally {
      signingOut.current = false;
    }
  }, []);

  // Keep the server cart in step with the bag while signed in, so a purchase
  // or an edit isn't undone by the merge at the next sign-in.
  const signedInUserId =
    state.status === "signedIn" ? state.user?.id : undefined;
  useEffect(() => {
    if (signedInUserId === undefined) return;
    return startCartAutoSync(signedInUserId);
  }, [signedInUserId]);

  useEffect(() => {
    onAuthFailure = () => {
      signOut("expired");
    };
    return () => {
      onAuthFailure = () => {};
    };
  }, [signOut]);

  const continueAsGuest = useCallback(async () => {
    await saveGuest(true);
    setState((s) => ({ ...s, status: "guest" }));
  }, []);

  const completeOnboarding = useCallback(async () => {
    await saveOnboarded(true);
    setState((s) => ({ ...s, onboarded: true }));
  }, []);

  const unlock = useCallback(async () => {
    const ok = await authenticateWithBiometrics("Unlock Store Overflow");
    if (ok) setState((s) => ({ ...s, locked: false }));
    return ok;
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (!(await isBiometricAvailable())) return false;
      // Prove presence before turning it on, so nobody can enable it for you.
      if (!(await authenticateWithBiometrics("Enable biometric unlock")))
        return false;
    }
    await saveBiometricPreference(enabled);
    setState((s) => ({ ...s, biometricEnabled: enabled }));
    return true;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      signIn,
      signUp,
      completeSignIn,
      signOut,
      continueAsGuest,
      completeOnboarding,
      unlock,
      setBiometricEnabled,
    }),
    [
      state,
      signIn,
      signUp,
      completeSignIn,
      signOut,
      continueAsGuest,
      completeOnboarding,
      unlock,
      setBiometricEnabled,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
