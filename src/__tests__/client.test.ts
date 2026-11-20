/**
 * API client tests: bearer token, single-flight refresh, retry-once,
 * no-refresh on login 401, refresh bypassing the middleware, session expiry,
 * X-Request-ID capture, timeouts and the "waking up" signal.
 *
 * A fake fetch plays the server, so no network is used. Tokens live in an
 * in-memory store instead of SecureStore.
 */

import { createApiClient } from '@/api/client';
import { unwrap } from '@/api/errors';
import type { TokenStore } from '@/api/authMiddleware';
import { getLastFailedRequest, isServerWaking, resetApiStatusForTests } from '@/api/status';
import { TimeoutError } from '@/api/transport';

const BASE = 'http://localhost:8000';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/** In-memory token store with spies. */
function memoryTokens(access: string | null = 'old-access', refresh: string | null = 'old-refresh') {
  const store = { access, refresh };
  const tokens: TokenStore & { store: typeof store } = {
    store,
    getAccessToken: jest.fn(async () => store.access),
    getRefreshToken: jest.fn(async () => store.refresh),
    saveTokens: jest.fn(async (a: string, r: string) => {
      store.access = a;
      store.refresh = r;
    }),
    clearTokens: jest.fn(async () => {
      store.access = null;
      store.refresh = null;
    }),
  };
  return tokens;
}

/**
 * A fake backend:
 *  - protected routes accept only "Bearer new-access" (the old token is expired)
 *  - /auth/refresh answers with `refreshStatus`
 */
function fakeServer(options: { refreshStatus?: number; refreshDelayMs?: number } = {}) {
  const { refreshStatus = 200, refreshDelayMs = 10 } = options;
  const calls: { method: string; path: string; auth: string | null; body: string }[] = [];

  const fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    const path = new URL(request.url).pathname;
    const body = await request.text();
    calls.push({ method: request.method, path, auth: request.headers.get('Authorization'), body });

    if (path === '/auth/refresh') {
      await new Promise((r) => setTimeout(r, refreshDelayMs));
      return refreshStatus === 200
        ? json(200, { access_token: 'new-access', refresh_token: 'new-refresh', token_type: 'bearer' })
        : json(refreshStatus, { detail: 'Invalid refresh token' }, { 'X-Request-ID': 'srv-refresh' });
    }
    if (path === '/auth/login') {
      return json(401, { detail: 'Incorrect email or password' }, { 'X-Request-ID': 'srv-login' });
    }
    if (request.headers.get('Authorization') !== 'Bearer new-access') {
      return json(401, { detail: 'Could not validate credentials' }, { 'X-Request-ID': 'srv-401' });
    }
    if (path === '/users/me') {
      return json(200, { id: 1, email: 'a@b.co', display_name: null, created_at: '2026-11-01T00:00:00Z' });
    }
    if (path === '/logs') {
      return json(201, { id: 7, plan_item_id: 3, log_date: '2026-11-20', completed_at: 'x', value: null });
    }
    return json(404, { detail: 'Not found' });
  });

  return { fetch, calls, count: (path: string) => calls.filter((c) => c.path === path).length };
}

function setup(serverOptions?: Parameters<typeof fakeServer>[0], tokens = memoryTokens()) {
  const server = fakeServer(serverOptions);
  const onSessionExpired = jest.fn();
  const client = createApiClient({
    baseUrl: BASE,
    fetch: server.fetch as typeof globalThis.fetch,
    tokens,
    onSessionExpired,
    createRequestId: () => 'client-id-1234',
  });
  return { client, server, tokens, onSessionExpired };
}

beforeEach(() => resetApiStatusForTests());

describe('auth middleware', () => {
  it('sends GET /health without a bearer token', async () => {
    const { client, server } = setup();
    await client.GET('/health');
    expect(server.calls[0]).toMatchObject({ path: '/health', auth: null });
  });

  it('attaches the stored access token to protected calls', async () => {
    const { client, server, tokens } = setup();
    tokens.store.access = 'new-access';
    const { data } = await client.GET('/users/me');
    expect(data?.id).toBe(1);
    expect(server.calls[0]!.auth).toBe('Bearer new-access');
    expect(server.count('/auth/refresh')).toBe(0);
  });

  it('refreshes on 401 and retries the original request exactly once', async () => {
    const { client, server, tokens } = setup();
    const { data, response } = await client.GET('/users/me');

    expect(response.status).toBe(200);
    expect(data?.email).toBe('a@b.co');
    expect(server.calls.map((c) => c.path)).toEqual(['/users/me', '/auth/refresh', '/users/me']);
    expect(server.calls[1]!.body).toBe(JSON.stringify({ refresh_token: 'old-refresh' }));
    expect(server.calls[2]!.auth).toBe('Bearer new-access');
    expect(tokens.saveTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  });

  it('retries a POST with its original body', async () => {
    const { client, server } = setup();
    const { response } = await client.POST('/logs', { body: { plan_item_id: 3 } });
    expect(response.status).toBe(201);
    const posts = server.calls.filter((c) => c.path === '/logs');
    expect(posts).toHaveLength(2);
    expect(posts[1]!.body).toBe(JSON.stringify({ plan_item_id: 3 }));
  });

  it('makes ONE refresh call for many parallel 401s (single-flight)', async () => {
    const { client, server } = setup({ refreshDelayMs: 30 });
    const results = await Promise.all(Array.from({ length: 6 }, () => client.GET('/users/me')));

    expect(results.every((r) => r.response.status === 200)).toBe(true);
    expect(server.count('/auth/refresh')).toBe(1);
    // 6 originals + 6 retries
    expect(server.count('/users/me')).toBe(12);
  });

  it('retries a late 401 with the already-refreshed token instead of refreshing again', async () => {
    const { client, server, tokens } = setup();
    await client.GET('/users/me'); // refreshes once
    // Simulate a request that was sent with the old token but answered after the refresh.
    const sentWithOld = memoryTokens('old-access', 'new-refresh');
    const late = createApiClient({
      baseUrl: BASE,
      fetch: server.fetch as typeof globalThis.fetch,
      tokens: {
        ...tokens,
        // First read (onRequest) gives the old token, later reads the new one.
        getAccessToken: jest
          .fn<Promise<string | null>, []>()
          .mockResolvedValueOnce('old-access')
          .mockResolvedValue('new-access'),
        getRefreshToken: sentWithOld.getRefreshToken,
      },
      onSessionExpired: jest.fn(),
    });
    const { response } = await late.GET('/users/me');
    expect(response.status).toBe(200);
    expect(server.count('/auth/refresh')).toBe(1);
  });

  it('does NOT refresh on a 401 from /auth/login', async () => {
    const { client, server, onSessionExpired } = setup();
    const { response } = await client.POST('/auth/login', {
      body: { username: 'a@b.co', password: 'wrong-password', scope: '' },
    });
    expect(response.status).toBe(401);
    expect(server.count('/auth/refresh')).toBe(0);
    expect(server.calls[0]!.auth).toBeNull();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('when refresh returns 401: clears tokens, signals expiry, and does not loop', async () => {
    const { client, server, tokens, onSessionExpired } = setup({ refreshStatus: 401 });
    const { response } = await client.GET('/users/me');

    expect(response.status).toBe(401);
    // The refresh went out once and was not itself refreshed or retried.
    expect(server.count('/auth/refresh')).toBe(1);
    expect(server.count('/users/me')).toBe(1);
    expect(tokens.clearTokens).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(tokens.store).toEqual({ access: null, refresh: null });
  });

  it('parallel 401s with a rejected refresh expire the session once', async () => {
    const { client, server, onSessionExpired } = setup({ refreshStatus: 401 });
    await Promise.all(Array.from({ length: 4 }, () => client.GET('/users/me')));
    expect(server.count('/auth/refresh')).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the tokens when refresh fails for a non-auth reason (5xx)', async () => {
    const { client, tokens, onSessionExpired } = setup({ refreshStatus: 503 });
    const { response } = await client.GET('/users/me');
    expect(response.status).toBe(401);
    expect(tokens.clearTokens).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('expires the session without a refresh call when no refresh token is stored', async () => {
    const { client, server, onSessionExpired } = setup(undefined, memoryTokens(null, null));
    const { response } = await client.GET('/users/me');
    expect(response.status).toBe(401);
    expect(server.count('/auth/refresh')).toBe(0);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('records the server X-Request-ID of the latest failed request', async () => {
    const { client } = setup();
    await client.POST('/auth/login', { body: { username: 'a@b.co', password: 'x', scope: '' } });
    expect(getLastFailedRequest()).toMatchObject({
      requestId: 'srv-login',
      method: 'POST',
      path: '/auth/login',
      status: 401,
    });
  });

  it('sends its own X-Request-ID and records it when no response arrives', async () => {
    const fetch = jest.fn(async (input: RequestInfo | URL) => {
      expect((input as Request).headers.get('X-Request-ID')).toBe('client-id-1234');
      throw new TypeError('Network request failed');
    });
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fetch as typeof globalThis.fetch,
      tokens: memoryTokens(),
      onSessionExpired: jest.fn(),
      createRequestId: () => 'client-id-1234',
    });
    await expect(unwrap('read_me', client.GET('/users/me'))).rejects.toMatchObject({ kind: 'network' });
    expect(getLastFailedRequest()).toMatchObject({ requestId: 'client-id-1234', status: null, path: '/users/me' });
  });

  it('maps a plain-text 5xx body without crashing', async () => {
    const fetch = jest.fn(async () => new Response('Internal Server Error', { status: 500 }));
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fetch as typeof globalThis.fetch,
      tokens: memoryTokens('new-access'),
      onSessionExpired: jest.fn(),
    });
    await expect(unwrap('read_me', client.GET('/users/me'))).rejects.toMatchObject({
      kind: 'server',
      message: 'Something went wrong on our side. Try again.',
    });
  });
});

describe('transport timeouts and the waking signal', () => {
  afterEach(() => jest.useRealTimers());

  /** A fetch that never answers until aborted. */
  const hangingFetch = jest.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  );

  it('uses a 90 s timeout for the first call and flags "waking" after 5 s', async () => {
    jest.useFakeTimers();
    const client = createApiClient({
      baseUrl: BASE,
      fetch: hangingFetch as typeof globalThis.fetch,
      tokens: memoryTokens(),
      onSessionExpired: jest.fn(),
    });
    const pending = unwrap('health_check', client.GET('/health'));
    const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout' });

    await jest.advanceTimersByTimeAsync(4_900);
    expect(isServerWaking()).toBe(false);
    await jest.advanceTimersByTimeAsync(200);
    expect(isServerWaking()).toBe(true);

    await jest.advanceTimersByTimeAsync(60_000); // 65 s: still waiting (cold timeout is 90 s)
    expect(isServerWaking()).toBe(true);
    await jest.advanceTimersByTimeAsync(25_000); // 90 s: timed out
    await assertion;
    expect(isServerWaking()).toBe(false);
  });

  it('uses the shorter warm timeout once the server has answered', async () => {
    jest.useFakeTimers();
    let first = true;
    const fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (first) {
        first = false;
        return Promise.resolve(json(200, { status: 'ok' }));
      }
      return hangingFetch(input, init);
    });
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fetch as typeof globalThis.fetch,
      tokens: memoryTokens(),
      onSessionExpired: jest.fn(),
    });
    await client.GET('/health');

    const pending = client.GET('/health');
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(30_001);
    await assertion;
  });
});
