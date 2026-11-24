/**
 * src/lib/storage.ts
 *
 * Secure storage backed by expo-secure-store: the auth tokens, the registered
 * push token, and the last answer to the time zone prompt (kept here because
 * AsyncStorage is reserved for theme preferences).
 *
 * Rules (from the brief):
 *  - Access tokens and refresh tokens ONLY go into expo-secure-store.
 *  - Never store tokens in AsyncStorage, logs, or anywhere else.
 *  - Never log the token values.
 *  - Theme preferences (light/dark, accent) go into AsyncStorage — handled
 *    separately in src/theme/.
 *
 * This module exposes simple read/write/delete helpers that the auth feature
 * and the startup gate import. Nothing else in the codebase touches tokens.
 */

import * as SecureStore from 'expo-secure-store';

/** Keys used to store tokens. Centralised here so a typo never creates a ghost entry. */
const KEYS = {
  accessToken: 'auth.access_token',
  refreshToken: 'auth.refresh_token',
  pushToken: 'push.expo_token',
  timezoneAnswer: 'timezone.last_answer',
} as const;

// ---------------------------------------------------------------------------
// Token pair helpers
// ---------------------------------------------------------------------------

/**
 * Saves both tokens atomically (best-effort — SecureStore has no transaction
 * API, but both writes happen synchronously from the caller's perspective).
 * Never pass token values to any log statement.
 */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, refreshToken),
  ]);
}

/** Returns the stored access token, or null if not found. */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.accessToken);
}

/** Returns the stored refresh token, or null if not found. */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.refreshToken);
}

/**
 * Deletes both tokens. Call this on logout and after DELETE /users/me.
 * Silent on missing keys — idempotent.
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
  ]);
}

/** True when a refresh token is stored (the startup gate's "has tokens?" check). */
export async function hasStoredTokens(): Promise<boolean> {
  return (await getRefreshToken()) !== null;
}

/** The helpers above as one object, in the shape the API client's auth middleware expects. */
export const secureTokenStore = {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
};

// ---------------------------------------------------------------------------
// Push token (Milestone 8 saves it after registering it with the API)
// ---------------------------------------------------------------------------

export async function savePushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.pushToken, token);
}

/** The push token this device registered, or null if it never did. */
export async function getPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.pushToken);
}

export async function clearPushToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.pushToken);
}

// ---------------------------------------------------------------------------
// Time zone prompt (the shape is owned by features/settings/timezonePrompt.ts)
// ---------------------------------------------------------------------------

export async function saveTimezoneAnswer(raw: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.timezoneAnswer, raw);
}

export async function getTimezoneAnswer(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.timezoneAnswer);
}

export async function clearTimezoneAnswer(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.timezoneAnswer);
}
