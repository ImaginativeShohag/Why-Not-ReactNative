export interface LoginPayload {
  username: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  username: string;
  password: string;
}

export type AuthProvider = "password" | "apple" | "google";

/** Non-sensitive profile, safe to keep in AsyncStorage for the boot UI. */
export interface SessionUser {
  id: number;
  username: string;
  email?: string;
  displayName?: string;
  provider: AuthProvider;
}

/** What every sign-in path (password, Apple, Google) produces. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends SessionTokens {
  user: SessionUser;
}
