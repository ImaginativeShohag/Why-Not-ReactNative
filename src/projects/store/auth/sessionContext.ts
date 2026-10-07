import { createContext } from "react";

import type {
  AuthResult,
  LoginPayload,
  SessionUser,
  SignUpPayload,
} from "../models/Auth";

/**
 *            ┌──────────┐
 *            │ loading  │  (reading keychain on boot)
 *            └────┬─────┘
 *      token?     │     no token
 *     ┌───────────┴───────────┐
 *     ▼                       ▼
 * signedIn ◄──── sign in ── signedOut ── continue as guest ──► guest
 *     │  refresh fails / sign out ──► signedOut
 */
export type SessionStatus = "loading" | "signedOut" | "guest" | "signedIn";

export type SessionContextValue = {
  status: SessionStatus;
  user: SessionUser | null;
  onboarded: boolean;
  /** Signed in, but waiting for biometric unlock on this launch. */
  locked: boolean;
  biometricEnabled: boolean;
  signIn: (credentials: LoginPayload) => Promise<void>;
  signUp: (input: SignUpPayload) => Promise<void>;
  /** Finishes a social flow once the provider + backend produced a session. */
  completeSignIn: (
    result: AuthResult,
    method: "apple" | "google",
  ) => Promise<void>;
  signOut: (reason?: "user" | "expired") => Promise<void>;
  continueAsGuest: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
