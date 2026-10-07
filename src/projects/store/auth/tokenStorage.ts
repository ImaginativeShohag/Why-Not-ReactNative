import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import type { SessionTokens, SessionUser } from "../models/Auth";

/**
 * Storage rules (see the doc's table):
 * - Refresh token → Keychain/Keystore, WHEN_UNLOCKED_THIS_DEVICE_ONLY: never
 *   leaves the device, never lands in a backup.
 * - Access token  → memory for request use, plus secure-store so a cold start
 *   can resume without a refresh round-trip.
 * - Profile       → AsyncStorage: non-sensitive, needed instantly for boot UI.
 * - Tokens NEVER go to AsyncStorage — it is a plain file on disk.
 */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const KEYS = {
  accessToken: "store.accessToken",
  refreshToken: "store.refreshToken",
  user: "store.session.user",
  biometric: "store.session.biometric",
  onboarded: "store.onboarded",
  guest: "store.session.guest",
} as const;

let memoryAccessToken: string | null = null;

/** Synchronous read used by the request interceptor. */
export const getAccessToken = () => memoryAccessToken;

export async function saveTokens(tokens: SessionTokens) {
  memoryAccessToken = tokens.accessToken;
  await Promise.all([
    SecureStore.setItemAsync(
      KEYS.accessToken,
      tokens.accessToken,
      SECURE_OPTIONS,
    ),
    SecureStore.setItemAsync(
      KEYS.refreshToken,
      tokens.refreshToken,
      SECURE_OPTIONS,
    ),
  ]);
}

export async function loadTokens(): Promise<SessionTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken, SECURE_OPTIONS),
    SecureStore.getItemAsync(KEYS.refreshToken, SECURE_OPTIONS),
  ]);
  if (!accessToken || !refreshToken) return null;
  memoryAccessToken = accessToken;
  return { accessToken, refreshToken };
}

export const loadRefreshToken = () =>
  SecureStore.getItemAsync(KEYS.refreshToken, SECURE_OPTIONS);

export async function clearTokens() {
  memoryAccessToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken, SECURE_OPTIONS),
    SecureStore.deleteItemAsync(KEYS.refreshToken, SECURE_OPTIONS),
  ]);
}

export const saveUser = (user: SessionUser) =>
  AsyncStorage.setItem(KEYS.user, JSON.stringify(user));

export async function loadUser(): Promise<SessionUser | null> {
  const raw = await AsyncStorage.getItem(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export const clearUser = () => AsyncStorage.removeItem(KEYS.user);

const readFlag = async (key: string) =>
  (await AsyncStorage.getItem(key)) === "1";
const writeFlag = (key: string, value: boolean) =>
  value ? AsyncStorage.setItem(key, "1") : AsyncStorage.removeItem(key);

export const loadBiometricPreference = () => readFlag(KEYS.biometric);
export const saveBiometricPreference = (enabled: boolean) =>
  writeFlag(KEYS.biometric, enabled);

export const loadOnboarded = () => readFlag(KEYS.onboarded);
export const saveOnboarded = (value: boolean) =>
  writeFlag(KEYS.onboarded, value);

export const loadGuest = () => readFlag(KEYS.guest);
export const saveGuest = (value: boolean) => writeFlag(KEYS.guest, value);
