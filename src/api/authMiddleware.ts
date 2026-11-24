/**
 * src/api/authMiddleware.ts
 *
 * openapi-fetch middleware that handles auth for every call made through the
 * app's client (brief: "Authentication flow"):
 *
 *  - Adds `Authorization: Bearer <access token>` to protected endpoints.
 *  - Adds an `X-Request-ID` to every request, so even a request that never got
 *    a response has an id for "Copy debug info". The server echoes it back.
 *  - On a 401 from a protected endpoint: refresh the tokens (single-flight, so
 *    many parallel 401s share ONE refresh call), then retry the original
 *    request exactly once with the new token.
 *  - A 401 from /auth/login (wrong password) or the other public endpoints is
 *    returned as is: it must never trigger a refresh.
 *  - If the refresh is rejected (401), or the retried request is still 401,
 *    the stored tokens are cleared and `onSessionExpired` fires, which moves
 *    the app to the auth stack.
 *  - Records every failed request (status, path template, X-Request-ID).
 *
 * The refresh call itself is passed in as `refresh` and must use a client
 * WITHOUT this middleware, so a failing refresh can never recurse.
 */

import type { Middleware } from 'openapi-fetch';

import type { paths } from './schema';
import { recordFailedRequest, recordRequestId } from './status';

/** Where tokens live. The app passes the SecureStore implementation from src/lib/storage.ts. */
export type TokenStore = {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  saveTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
};

/**
 * Result of one refresh attempt:
 *  - a new token pair: success
 *  - 'rejected': the server said 401 (refresh token invalid or expired)
 *  - 'failed': anything else (offline, timeout, 5xx). Tokens are kept, since
 *    the refresh token may still be valid once the network is back.
 */
export type RefreshResult = { access_token: string; refresh_token: string } | 'rejected' | 'failed';

export type AuthMiddlewareOptions = {
  tokens: TokenStore;
  refresh: (refreshToken: string) => Promise<RefreshResult>;
  onSessionExpired: () => void;
  /** Makes the X-Request-ID we send. Injected in tests. */
  createRequestId?: () => string;
};

/**
 * Endpoints that never carry a bearer token and whose 401 means something
 * else (wrong password on login). Typed against the generated `paths`, so a
 * renamed path in the contract is a compile error here.
 */
const PUBLIC_PATHS: ReadonlySet<keyof paths> = new Set<keyof paths>([
  '/auth/login',
  '/auth/signup',
  '/auth/refresh',
  '/health',
  '/health/db',
]);

const REQUEST_ID_HEADER = 'X-Request-ID';
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 16 random characters from the set the server accepts (8 to 64 of A-Z a-z 0-9 _ -). Not a secret. */
export function createRequestId(): string {
  let id = '';
  for (let i = 0; i < 16; i += 1) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return id;
}

function isPublic(schemaPath: string): boolean {
  return PUBLIC_PATHS.has(schemaPath as keyof paths);
}

function bearerOf(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions): Middleware {
  const { tokens, refresh, onSessionExpired, createRequestId: makeId = createRequestId } = options;

  // Untouched copies of protected requests, keyed by openapi-fetch's per-call
  // id. A Request body can only be read once, so the retry needs its own copy.
  const retryCopies = new Map<string, Request>();

  // The one shared refresh, while it runs. Everyone who sees a 401 awaits it.
  let refreshInFlight: Promise<string | null> | null = null;

  async function expireSession(): Promise<void> {
    await tokens.clearTokens();
    onSessionExpired();
  }

  /** Single-flight refresh. Resolves to the new access token, or null if it could not refresh. */
  function refreshOnce(): Promise<string | null> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshToken = await tokens.getRefreshToken();
        if (!refreshToken) {
          await expireSession();
          return null;
        }
        let result: RefreshResult;
        try {
          result = await refresh(refreshToken);
        } catch {
          result = 'failed';
        }
        // The person logged out (or deleted the account, or logged in as someone
        // else) while this refresh was running. Its outcome belongs to a session
        // that is gone: saving the new pair would bring that session back, and
        // expiring would sign out the new one.
        if ((await tokens.getRefreshToken()) !== refreshToken) return null;
        if (result === 'rejected') {
          await expireSession();
          return null;
        }
        if (result === 'failed') return null;
        await tokens.saveTokens(result.access_token, result.refresh_token);
        return result.access_token;
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  /** Keeps the latest X-Request-ID, and the details when the request failed. */
  function recordResponse(request: Request, response: Response, schemaPath: string): void {
    const requestId = response.headers.get(REQUEST_ID_HEADER) ?? request.headers.get(REQUEST_ID_HEADER);
    recordRequestId(requestId);
    if (response.ok) return;
    recordFailedRequest({
      requestId,
      method: request.method,
      path: schemaPath,
      status: response.status,
      at: new Date().toISOString(),
    });
  }

  return {
    async onRequest({ request, schemaPath, id }) {
      if (!request.headers.has(REQUEST_ID_HEADER)) {
        request.headers.set(REQUEST_ID_HEADER, makeId());
      }
      if (isPublic(schemaPath)) return request;

      const accessToken = await tokens.getAccessToken();
      if (accessToken) request.headers.set('Authorization', `Bearer ${accessToken}`);
      retryCopies.set(id, request.clone());
      return request;
    },

    async onResponse({ request, response, schemaPath, id, options: fetchOptions }) {
      const retryCopy = retryCopies.get(id);
      retryCopies.delete(id);
      recordResponse(request, response, schemaPath);

      // Only a 401 from a protected endpoint starts the refresh flow.
      if (response.status !== 401 || isPublic(schemaPath) || !retryCopy) return undefined;

      // If another call already refreshed while this one was in flight, the
      // stored token is newer than the one we sent: just retry with it.
      const sentToken = bearerOf(request);
      const storedToken = await tokens.getAccessToken();
      const newToken = storedToken && storedToken !== sentToken ? storedToken : await refreshOnce();

      // Could not refresh: hand the original 401 to the caller.
      if (!newToken) return undefined;

      // Retry exactly once. It goes straight to the transport, not through the
      // middleware again, so it can never loop.
      retryCopy.headers.set('Authorization', `Bearer ${newToken}`);
      const retried = await fetchOptions.fetch(retryCopy);
      recordResponse(retryCopy, retried, schemaPath);

      // A fresh token that is still refused (e.g. the account was deleted):
      // the session is over.
      if (retried.status === 401) await expireSession();
      return retried;
    },

    onError({ request, schemaPath, id }) {
      retryCopies.delete(id);
      recordRequestId(request.headers.get(REQUEST_ID_HEADER));
      recordFailedRequest({
        requestId: request.headers.get(REQUEST_ID_HEADER),
        method: request.method,
        path: schemaPath,
        status: null,
        at: new Date().toISOString(),
      });
      // Returning nothing re-throws the original error to the caller.
      return undefined;
    },
  };
}
