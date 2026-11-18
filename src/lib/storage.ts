/**
 * src/lib/storage.ts
 *
 * Secure token storage backed by expo-secure-store.
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
