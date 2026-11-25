/**
 * Push token lifecycle: the registrar's steps and failures on their own, then
 * through the real session store (logout, account deletion) with fake storage,
 * server and notifications module.
 */

import { deleteAccount, signOut } from '@/features/auth/session';
import { pushRegistrar } from '@/features/notifications/push';
import { createRegistrar, type RegistrarDeps } from '@/features/notifications/registrar';
import { saveReminderPromptShownTo, saveTokens } from '@/lib/storage';

const TOKEN = 'ExponentPushToken[test]';

// Names starting with "mock" may be used inside jest.mock.
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockSecure.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void mockSecure.set(key, value),
  deleteItemAsync: async (key: string) => void mockSecure.delete(key),
}));
// Under Jest, Expo believes it runs in Expo Go, where push is off.
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
}));
const mockGetToken = jest.fn();
jest.mock('expo-notifications', () => ({
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  AndroidImportance: { DEFAULT: 5 },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true, status: 'granted', canAskAgain: true }),
  getExpoPushTokenAsync: (options: unknown) => mockGetToken(options),
}));

/** A promise to settle by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Deps that write down the order they were called in. */
function steps(overrides: Partial<RegistrarDeps> = {}) {
  const order: string[] = [];
  const log =
    <A extends unknown[], R>(name: string, fn: (...args: A) => R) =>
    (...args: A) => {
      order.push(name);
      return fn(...args);
    };
  const deps: RegistrarDeps = {
    isSupported: log('supported', overrides.isSupported ?? (() => true)),
    isAllowed: log('allowed', overrides.isAllowed ?? (async () => true)),
    prepareChannel: log('channel', overrides.prepareChannel ?? (async () => undefined)),
    getToken: log('token', overrides.getToken ?? (async () => TOKEN)),
    saveToken: log('save', overrides.saveToken ?? (async () => undefined)),
    register: log('register', overrides.register ?? (async () => undefined)),
  };
  return { order, deps };
}

describe('createRegistrar', () => {
  it('creates the channel before the token, and stores the token before the POST', async () => {
    const { order, deps } = steps();
    await createRegistrar(deps).start();
    expect(order).toEqual(['supported', 'allowed', 'channel', 'token', 'save', 'register']);
  });

  it('stops at once where push is not supported', async () => {
    const { order, deps } = steps({ isSupported: () => false });
    await createRegistrar(deps).start();
    expect(order).toEqual(['supported']);
  });

  it('requests no token without the permission', async () => {
    const { order, deps } = steps({ isAllowed: async () => false });
    await createRegistrar(deps).start();
    expect(order).toEqual(['supported', 'allowed']);
  });

  it('shares one run between calls made at the same time', async () => {
    const { order, deps } = steps();
    const registrar = createRegistrar(deps);
    await Promise.all([registrar.start(), registrar.start()]);
    expect(order.filter((s) => s === 'register')).toHaveLength(1);
  });

  it.each(['prepareChannel', 'getToken', 'saveToken', 'register'] as const)('a failing %s never throws', async (name) => {
    const { deps } = steps({ [name]: async () => Promise.reject(new Error('x')) });
    await expect(createRegistrar(deps).start()).resolves.toBeUndefined();
  });

  it('startIfNeeded retries a failed registration, but not a successful one', async () => {
    const register = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const registrar = createRegistrar(steps({ register }).deps);
    await registrar.start();
    await registrar.startIfNeeded();
    expect(register).toHaveBeenCalledTimes(2);
    await registrar.startIfNeeded();
    expect(register).toHaveBeenCalledTimes(2);
  });

  it('registers again for the next account after stop()', async () => {
    const register = jest.fn(async () => undefined);
    const registrar = createRegistrar(steps({ register }).deps);
    await registrar.start();
    registrar.stop();
    await registrar.startIfNeeded();
    expect(register).toHaveBeenCalledTimes(2);
  });

  it('stop() while the token is being fetched: nothing is stored or sent', async () => {
    const token = deferred<string>();
    const { order, deps } = steps({ getToken: () => token.promise });
    const registrar = createRegistrar(deps);
    const done = registrar.start();
    await flush();
    registrar.stop();
    token.resolve(TOKEN);
    await done;
    expect(order).not.toContain('save');
    expect(order).not.toContain('register');
  });

  it('settled() waits for a POST under way, and abort() cancels it', async () => {
    let signal: AbortSignal | undefined;
    const post = deferred<void>();
    const registrar = createRegistrar(
      steps({
        register: (_token, s) => {
          signal = s;
          return post.promise;
        },
      }).deps,
    );
    void registrar.start();
    await flush();
    registrar.stop();
    let settled = false;
    const waiting = registrar.settled().then(() => void (settled = true));
    await flush();
    expect(settled).toBe(false);
    registrar.abort();
    expect(signal?.aborted).toBe(true);
    post.reject(new Error('aborted'));
    await waiting;
    expect(settled).toBe(true);
  });
});

describe('with the session store', () => {
  const realFetch = globalThis.fetch;
  let calls: string[];
  let bodies: string[];
  /** Holds the register call back until resolved, when set. */
  let holdRegister: Promise<void> | null;

  beforeEach(async () => {
    calls = [];
    bodies = [];
    holdRegister = null;
    mockGetToken.mockReset().mockResolvedValue({ data: TOKEN });
    mockSecure.clear();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;
      if (path === '/notifications/register-token') await holdRegister;
      calls.push(`${request.method} ${path}`);
      bodies.push(await request.clone().text());
      return new Response(null, { status: 204 });
    }) as typeof globalThis.fetch;
    await saveTokens('access-1', 'refresh-1');
    pushRegistrar.stop();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('gets the token for the EAS project and registers it', async () => {
    await pushRegistrar.start();
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'test-project' });
    expect(calls).toEqual(['POST /notifications/register-token']);
    expect(bodies).toEqual([JSON.stringify({ token: TOKEN })]);
    expect(mockSecure.get('push.expo_token')).toBe(TOKEN);
  });

  it('logout unregisters the same token, then clears storage', async () => {
    await pushRegistrar.start();
    await signOut();
    expect(calls).toEqual(['POST /notifications/register-token', 'POST /notifications/unregister-token']);
    expect(bodies[1]).toBe(bodies[0]);
    expect([...mockSecure.keys()]).toEqual([]);
  });

  it('logout during registration: unregister is sent after register', async () => {
    const hold = deferred<void>();
    holdRegister = hold.promise;
    void pushRegistrar.start();
    await flush();
    const out = signOut();
    await flush();
    expect(calls).toEqual([]);
    hold.resolve();
    await out;
    expect(calls).toEqual(['POST /notifications/register-token', 'POST /notifications/unregister-token']);
    expect([...mockSecure.keys()]).toEqual([]);
  });

  it('account deletion skips unregister and clears everything, including the prompt', async () => {
    await saveReminderPromptShownTo('1');
    await pushRegistrar.start();
    await deleteAccount();
    expect(calls).toEqual(['POST /notifications/register-token', 'DELETE /users/me']);
    expect([...mockSecure.keys()]).toEqual([]);
  });
});
