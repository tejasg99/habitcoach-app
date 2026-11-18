/**
 * src/api/client.ts
 *
 * The typed openapi-fetch client skeleton.
 *
 * Milestone 1 scope: just the typed client pointing at the env base URL.
 * Auth (Bearer token, single-flight refresh on 401, retry once, error mapping)
 * is added in Milestone 2 as middleware registered on this client.
 *
 * Request and response types come from the generated `paths` type
 * (`npm run api:types`). Never hand-write them.
 *
 * Usage:
 *   import { apiClient } from '@/api/client';
 *   const { data, error } = await apiClient.GET('/health');
 */

import createClient from 'openapi-fetch';

import { env } from '@/lib/env';

import type { paths } from './schema';

/**
 * Factory kept separate from the shared instance so tests can build a client
 * with any base URL (and a fake fetch) without touching process.env.
 */
export function createApiClient(baseUrl: string, fetch?: typeof globalThis.fetch) {
  return createClient<paths>({ baseUrl, ...(fetch ? { fetch } : {}) });
}

/** The single client instance used by the app. */
export const apiClient = createApiClient(env.apiUrl);
