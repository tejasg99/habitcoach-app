/**
 * src/lib/env.ts
 *
 * Typed environment module.
 *
 * Rules:
 *  - Every EXPO_PUBLIC_* variable is read here and nowhere else.
 *  - If a required variable is missing or invalid, importing this module
 *    throws, so the app fails loudly at startup instead of on the first API call.
 *  - There are NO hardcoded fallback URLs. Copy .env.example to .env.
 *
 * Why the literal `process.env.EXPO_PUBLIC_API_URL`:
 *  Expo's bundler only replaces that exact spelling at build time. Dynamic
 *  access such as process.env[key] is NOT replaced and would be undefined
 *  in the built app. So the read happens once, below, with the literal name.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   env.apiUrl // string, validated, no trailing slash
 */

/**
 * Pure validation + normalisation of the raw API URL. No side effects and no
 * access to process.env, which keeps it trivial to unit test.
 *
 * - Throws a descriptive error if the value is missing, blank or not an
 *   http(s) URL.
 * - Trims whitespace and removes any trailing slashes.
 */
export function parseApiUrl(raw: string | undefined): string {
  const value = raw?.trim();

  if (!value) {
    throw new Error(
      '[env] EXPO_PUBLIC_API_URL is not set.\n' +
        'Copy .env.example to .env and set EXPO_PUBLIC_API_URL ' +
        '(see the comments in .env.example), then restart Expo with: npx expo start -c',
    );
  }

  // Must look like http(s)://host[:port][/path]. This catches typos such as a
  // missing scheme ("localhost:8000") before they turn into confusing
  // network errors.
  if (!/^https?:\/\/[^\s/]+/i.test(value)) {
    throw new Error(
      `[env] EXPO_PUBLIC_API_URL must start with http:// or https:// (got "${value}").`,
    );
  }

  // "https://host/" and "https://host" must behave identically, because the
  // API client appends paths that start with "/".
  return value.replace(/\/+$/, '');
}

/** Validated environment values for the whole app. */
export const env = {
  /** Backend base URL, no trailing slash. */
  apiUrl: parseApiUrl(process.env.EXPO_PUBLIC_API_URL),
} as const;
