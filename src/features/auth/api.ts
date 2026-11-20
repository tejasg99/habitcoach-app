/**
 * src/features/auth/api.ts
 *
 * Signup and login calls. Both go through the shared client (so they get the
 * timeouts, X-Request-ID and failure recording) but are public endpoints, so
 * the auth middleware never adds a token or refreshes on their 401.
 *
 * Errors come back as `ApiError` from `unwrap` (see src/api/errors.ts).
 */

import { apiClient, type ApiClient } from '@/api/client';
import { unwrap } from '@/api/errors';
import type { components } from '@/api/schema';
import { saveTokens } from '@/lib/storage';

type LoginForm = components['schemas']['Body_login'];
type SignupBody = components['schemas']['UserCreate'];

/**
 * application/x-www-form-urlencoded encoding, written out by hand because
 * React Native's URLSearchParams is incomplete on some versions. Skips
 * null/undefined fields.
 */
export function formEncode(fields: Record<string, string | null | undefined>): string {
  return Object.entries(fields)
    .filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * POST /auth/login (form-encoded, email goes in `username`). Saves the token
 * pair to SecureStore on success. Throws ApiError (401 -> invalidCredentials,
 * 429 -> rateLimited, 422 -> field errors keyed `username` / `password`).
 */
export async function login(email: string, password: string, client: ApiClient = apiClient): Promise<void> {
  const body: LoginForm = { username: email, password, scope: '' };
  const tokens = await unwrap(
    'login',
    client.POST('/auth/login', {
      body,
      bodySerializer: (form) => formEncode(form),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  );
  await saveTokens(tokens.access_token, tokens.refresh_token);
}

/** POST /auth/signup (JSON). Throws ApiError (409 -> email taken, 422 -> field errors). */
export async function signup(input: SignupBody, client: ApiClient = apiClient): Promise<void> {
  await unwrap('signup', client.POST('/auth/signup', { body: input }));
}
