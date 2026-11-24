/**
 * Logout and account deletion, first as the pure steps (order, failures,
 * timeout), then through the real session store with fake storage and server.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createApiClient } from '@/api/client';
import { runDeleteAccount, runLogout, UNREGISTER_TIMEOUT_MS } from '@/features/auth/accountCleanup';
import { deleteAccount, getSession, signOut } from '@/features/auth/session';
import { unregisterStoredPushToken } from '@/features/notifications/pushToken';
import { settingsKeys } from '@/features/settings/queries';
import { queryClient } from '@/lib/queryClient';
import { savePushToken, saveTimezoneAnswer, saveTokens, secureTokenStore } from '@/lib/storage';
import { savePreferences, THEME_STORAGE_KEY } from '@/theme/preferences';

// In-memory SecureStore. (Names starting with "mock" may be used inside jest.mock.)
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockSecure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void mockSecure.set(key, value),
  deleteItemAsync: async (key: string) => void mockSecure.delete(key),
}));

/** Deps that write down the order they were called in. */
function steps(overrides: Record<string, () => Promise<void>> = {}) {
  const order: string[] = [];
  const step = (name: string) => async () => {
    order.push(name);
    await overrides[name]?.();
  };
  const sync = (name: string) => () => void order.push(name);
  return {
    order,
    unregisterPushToken: step('unregister') as (signal: AbortSignal) => Promise<void>,
    deleteMe: step('deleteMe'),
    clearTokens: step('tokens'),
    clearPushToken: step('push'),
    clearTimezoneAnswer: step('timezone'),
    clearCache: sync('cache'),
    goToLogin: sync('login'),
  };
}

const fail = async () => Promise.reject(new Error('x'));

describe('runLogout', () => {
  it('unregisters first, then clears tokens and cache, then goes to login', async () => {
    const d = steps();
    await runLogout(d);
    expect(d.order).toEqual(['unregister', 'tokens', 'push', 'cache', 'login']);
  });

  it.each(['unregister', 'tokens', 'push'])('still finishes when %s fails', async (name) => {
    const d = steps({ [name]: fail });
    await runLogout(d);
    expect(d.order).toEqual(['unregister', 'tokens', 'push', 'cache', 'login']);
  });

  it('does not wait for a sleeping server: aborts the unregister call after the timeout', async () => {
    jest.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const d = {
        ...steps(),
        unregisterPushToken: (s: AbortSignal) => {
          signal = s;
          return new Promise<void>(() => undefined);
        },
      };
      const done = runLogout(d);
      await jest.advanceTimersByTimeAsync(UNREGISTER_TIMEOUT_MS);
      await done;
      expect(signal?.aborted).toBe(true);
      expect(d.order).toEqual(['tokens', 'push', 'cache', 'login']);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('runDeleteAccount', () => {
  it('deletes on the server first, then clears the account data on the device', async () => {
    const d = steps();
    await runDeleteAccount(d);
    expect(d.order).toEqual(['deleteMe', 'tokens', 'push', 'timezone', 'cache', 'login']);
  });

  it('touches nothing on the device when the server call fails', async () => {
    const d = steps({ deleteMe: fail });
    await expect(runDeleteAccount(d)).rejects.toThrow();
    expect(d.order).toEqual(['deleteMe']);
  });

  it('a storage failure does not stop the rest', async () => {
    const d = steps({ tokens: fail });
    await runDeleteAccount(d);
    expect(d.order).toEqual(['deleteMe', 'tokens', 'push', 'timezone', 'cache', 'login']);
  });
});

describe('session store', () => {
  const realFetch = globalThis.fetch;
  let calls: { method: string; path: string; auth: string | null; body: string }[];
  let status: number;
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal?.aborted) throw new Error('Aborted');
    const request = input as Request;
    calls.push({
      method: request.method,
      path: new URL(request.url).pathname,
      auth: request.headers.get('Authorization'),
      body: await request.clone().text(),
    });
    return new Response(null, { status });
  }) as typeof globalThis.fetch;

  beforeEach(async () => {
    calls = [];
    status = 204;
    globalThis.fetch = fakeFetch;
    mockSecure.clear();
    await saveTokens('access-1', 'refresh-1');
    await saveTimezoneAnswer('{"userId":1,"zone":"Asia/Tokyo"}');
    await savePreferences({ mode: 'dark', accent: 'rose' });
    queryClient.setQueryData(settingsKeys.me, { id: 1 });
  });

  afterEach(async () => {
    globalThis.fetch = realFetch;
    queryClient.clear();
    await AsyncStorage.clear();
  });

  it('logout without a push token makes no request', async () => {
    await signOut();
    expect(calls).toEqual([]);
    expect(mockSecure.has('auth.access_token')).toBe(false);
    expect(mockSecure.has('auth.refresh_token')).toBe(false);
    expect(queryClient.getQueryData(settingsKeys.me)).toBeUndefined();
    expect(getSession()).toMatchObject({ phase: 'signedOut', authEntry: 'login' });
  });

  it('logout unregisters a stored push token while still authorised, once for a double tap', async () => {
    await savePushToken('ExponentPushToken[test]');
    await Promise.all([signOut(), signOut()]);
    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/notifications/unregister-token',
        auth: 'Bearer access-1',
        body: JSON.stringify({ token: 'ExponentPushToken[test]' }),
      },
    ]);
    expect(mockSecure.has('push.expo_token')).toBe(false);
  });

  it('logout keeps the theme (it belongs to the device)', async () => {
    await signOut();
    expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).not.toBeNull();
  });

  it('unregister works with any client and passes the abort signal on', async () => {
    await savePushToken('ExponentPushToken[test]');
    const client = createApiClient({
      baseUrl: 'http://localhost:8000',
      fetch: fakeFetch,
      tokens: secureTokenStore,
      onSessionExpired: jest.fn(),
    });
    const controller = new AbortController();
    controller.abort();
    await expect(unregisterStoredPushToken(controller.signal, client)).rejects.toMatchObject({ kind: 'network' });
  });

  it('delete account clears secure storage and cache, keeps the theme, and goes to login', async () => {
    await savePushToken('ExponentPushToken[test]');
    await deleteAccount();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['DELETE /users/me']);
    expect([...mockSecure.keys()]).toEqual([]);
    expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe(JSON.stringify({ mode: 'dark', accent: 'rose' }));
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(getSession()).toMatchObject({ phase: 'signedOut', authEntry: 'login' });
  });

  it('a failed delete keeps the person signed in', async () => {
    status = 500;
    await expect(deleteAccount()).rejects.toMatchObject({ kind: 'server' });
    expect(mockSecure.get('auth.refresh_token')).toBe('refresh-1');
    expect(queryClient.getQueryData(settingsKeys.me)).toEqual({ id: 1 });
  });
});
