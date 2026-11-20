/**
 * The startup gate's decision tree (brief: "App flow and navigation").
 */

import { mapApiError, type ApiOperation } from '@/api/errors';
import { continueToTabs, runStartup, type StartupDeps } from '@/lib/startup';

const apiError = (operation: ApiOperation, status: number) => mapApiError({ operation, status, body: { detail: 'x' } });

/** Deps for a fully set-up user; override per test. */
function deps(overrides: Partial<StartupDeps> = {}): StartupDeps & Record<string, jest.Mock> {
  return {
    warmUp: jest.fn(async () => ({})),
    hasTokens: jest.fn(async () => true),
    readMe: jest.fn(async () => ({ id: 1 })),
    readProfile: jest.fn(async () => ({ onboarding_complete: true })),
    readToday: jest.fn(async () => ({ items: [] })),
    onNetworkCheck: jest.fn(),
    runBackgroundTasks: jest.fn(),
    ...overrides,
  } as StartupDeps & Record<string, jest.Mock>;
}

describe('runStartup', () => {
  it('fires the /health warm-up at launch without waiting for it', async () => {
    const d = deps({ warmUp: jest.fn(() => new Promise(() => undefined)), hasTokens: jest.fn(async () => false) });
    await expect(runStartup(d, { warmUp: true })).resolves.toEqual({ route: 'auth' });
    expect(d.warmUp).toHaveBeenCalledTimes(1);
  });

  it('a failing warm-up never affects the decision', async () => {
    const d = deps({ warmUp: jest.fn(async () => Promise.reject(new Error('offline'))) });
    await expect(runStartup(d, { warmUp: true })).resolves.toEqual({ route: 'tabs', hasPlan: true });
  });

  it('skips the warm-up when re-running after login', async () => {
    const d = deps();
    await runStartup(d, { warmUp: false });
    expect(d.warmUp).not.toHaveBeenCalled();
  });

  it('no stored tokens -> auth stack, no API calls', async () => {
    const d = deps({ hasTokens: jest.fn(async () => false) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'auth' });
    expect(d.readMe).not.toHaveBeenCalled();
    expect(d.onNetworkCheck).not.toHaveBeenCalled();
  });

  it('/users/me 401 (refresh also failed) -> auth stack', async () => {
    const d = deps({ readMe: jest.fn(async () => Promise.reject(apiError('read_me', 401))) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'auth' });
    expect(d.readProfile).not.toHaveBeenCalled();
  });

  it('/users/me network error -> error (the user stays logged in)', async () => {
    const d = deps({ readMe: jest.fn(async () => Promise.reject(new TypeError('Network request failed'))) });
    const decision = await runStartup(d, { warmUp: false });
    expect(decision).toMatchObject({ route: 'error', error: { kind: 'network' } });
  });

  it('/onboarding/me 404 -> onboarding', async () => {
    const d = deps({ readProfile: jest.fn(async () => Promise.reject(apiError('read_my_profile', 404))) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'onboarding' });
    expect(d.readToday).not.toHaveBeenCalled();
  });

  it('profile with onboarding_complete false -> onboarding', async () => {
    const d = deps({ readProfile: jest.fn(async () => ({ onboarding_complete: false })) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'onboarding' });
  });

  it('/onboarding/me 5xx -> error', async () => {
    const d = deps({ readProfile: jest.fn(async () => Promise.reject(apiError('read_my_profile', 500))) });
    await expect(runStartup(d, { warmUp: false })).resolves.toMatchObject({ route: 'error' });
  });

  it('/plan/today 404 -> tabs with no plan', async () => {
    const d = deps({ readToday: jest.fn(async () => Promise.reject(apiError('get_today_plan', 404))) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'tabs', hasPlan: false });
  });

  it('/plan/today 200 -> tabs with a plan, and background tasks start', async () => {
    const d = deps();
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'tabs', hasPlan: true });
    expect(d.onNetworkCheck).toHaveBeenCalledTimes(1);
    expect(d.runBackgroundTasks).toHaveBeenCalledTimes(1);
  });

  it('/plan/today other failure -> tabs, plan unknown (Today retries itself)', async () => {
    const d = deps({ readToday: jest.fn(async () => Promise.reject(apiError('get_today_plan', 503))) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'tabs', hasPlan: null });
  });

  it('a 401 at a later step -> auth stack', async () => {
    const d = deps({ readToday: jest.fn(async () => Promise.reject(apiError('get_today_plan', 401))) });
    await expect(runStartup(d, { warmUp: false })).resolves.toEqual({ route: 'auth' });
  });
});

describe('continueToTabs (after onboarding is saved)', () => {
  it('no plan yet (404) -> tabs with hasPlan false, background tasks started', async () => {
    const d = deps({ readToday: jest.fn(async () => Promise.reject(apiError('get_today_plan', 404))) });
    await expect(continueToTabs(d)).resolves.toEqual({ route: 'tabs', hasPlan: false });
    expect(d.runBackgroundTasks).toHaveBeenCalledTimes(1);
    expect(d.readMe).not.toHaveBeenCalled();
    expect(d.readProfile).not.toHaveBeenCalled();
  });

  it('plan exists -> tabs with hasPlan true', async () => {
    await expect(continueToTabs(deps())).resolves.toEqual({ route: 'tabs', hasPlan: true });
  });

  it('network failure -> tabs with hasPlan unknown (Today retries itself)', async () => {
    const d = deps({ readToday: jest.fn(async () => Promise.reject(new TypeError('Network request failed'))) });
    await expect(continueToTabs(d)).resolves.toEqual({ route: 'tabs', hasPlan: null });
  });

  it('session expired -> auth', async () => {
    const d = deps({ readToday: jest.fn(async () => Promise.reject(apiError('get_today_plan', 401))) });
    await expect(continueToTabs(d)).resolves.toEqual({ route: 'auth' });
  });
});
