/**
 * src/api/client.ts
 *
 * The typed openapi-fetch client the whole app uses.
 *
 *   transport (timeouts, slow-request tracking)        transport.ts
 *     + auth middleware (bearer, refresh, retry once)  authMiddleware.ts
 *     = apiClient
 *
 * The refresh call uses a second, bare client that shares the transport but
 * has NO middleware, so it can never trigger another refresh.
 *
 * Request and response types come from the generated `paths` type
 * (`npm run api:types`). Never hand-write them.
 *
 * Usage:
 *   import { apiClient } from '@/api/client';
 *   import { unwrap } from '@/api/errors';
 *   const me = await unwrap('read_me', apiClient.GET('/users/me'));
 */

import createClient from 'openapi-fetch';

import { env } from '@/lib/env';
import { secureTokenStore } from '@/lib/storage';

import { createAuthMiddleware, type RefreshResult, type TokenStore } from './authMiddleware';
import { emitSessionExpired } from './events';
import type { paths } from './schema';
import { createTransport, type TransportOptions } from './transport';

export type ApiClientOptions = {
  baseUrl: string;
  /** The raw fetch (tests inject a fake). */
  fetch?: typeof globalThis.fetch;
  tokens: TokenStore;
  onSessionExpired: () => void;
  transport?: Omit<TransportOptions, 'fetch'>;
  createRequestId?: () => string;
};

export function createApiClient(options: ApiClientOptions) {
  const transport = createTransport({ ...options.transport, fetch: options.fetch });

  // No middleware on this one: it is used only for the refresh call.
  const bareClient = createClient<paths>({ baseUrl: options.baseUrl, fetch: transport });

  async function refresh(refreshToken: string): Promise<RefreshResult> {
    const { data, response } = await bareClient.POST('/auth/refresh', { body: { refresh_token: refreshToken } });
    if (response.ok && data) return { access_token: data.access_token, refresh_token: data.refresh_token };
    // 401 = the refresh token is invalid/expired; 422 = malformed. Both mean "log in again".
    if (response.status === 401 || response.status === 422) return 'rejected';
    return 'failed';
  }

  const client = createClient<paths>({ baseUrl: options.baseUrl, fetch: transport });
  client.use(
    createAuthMiddleware({
      tokens: options.tokens,
      refresh,
      onSessionExpired: options.onSessionExpired,
      createRequestId: options.createRequestId,
    }),
  );
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** The single client instance used by the app. */
export const apiClient = createApiClient({
  baseUrl: env.apiUrl,
  tokens: secureTokenStore,
  onSessionExpired: emitSessionExpired,
});
