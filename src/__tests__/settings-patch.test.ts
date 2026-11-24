/**
 * Settings saves: PATCH (never PUT) with only the changed field, the display
 * name rules, and the optimistic cache with revert. Requests go through the
 * real client with a fake fetch.
 */

import { MutationObserver, QueryClient } from '@tanstack/react-query';

import { createApiClient } from '@/api/client';
import { ERROR_COPY, mapApiError } from '@/api/errors';
import { planKeys } from '@/features/plan/queries';
import { progressKeys } from '@/features/progress/queries';
import { patchDisplayName, patchProfile, type ProfileChange } from '@/features/settings/api';
import { displayNameError } from '@/features/settings/displayName';
import { profileMutationOptions, saveErrorMessage } from '@/features/settings/mutations';
import { settingsKeys, type Profile } from '@/features/settings/queries';

const PROFILE: Profile = {
  goal: 'stay_active',
  fitness_level: 'beginner',
  dietary_pref: 'vegan',
  equipment: ['yoga mat'],
  timezone: 'Europe/London',
  reminder_time: '20:00:00',
  reminders_enabled: true,
  onboarding_complete: true,
  updated_at: '2026-11-24T08:00:00Z',
};

function clientReturning(body: unknown) {
  const fetch = jest.fn(
    async (_input: RequestInfo | URL) =>
      new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  const client = createApiClient({
    baseUrl: 'http://localhost:8000',
    fetch: fetch as typeof globalThis.fetch,
    tokens: {
      getAccessToken: async () => 'a',
      getRefreshToken: async () => 'r',
      saveTokens: async () => undefined,
      clearTokens: async () => undefined,
    },
    onSessionExpired: jest.fn(),
  });
  const sent = async () => {
    const request = fetch.mock.calls[0]![0] as Request;
    return { method: request.method, path: new URL(request.url).pathname, body: await request.clone().text() };
  };
  return { client, sent };
}

describe('PATCH bodies', () => {
  const changes: ProfileChange[] = [
    { field: 'reminders_enabled', value: false },
    { field: 'reminder_time', value: '07:30:00' },
    { field: 'timezone', value: 'Asia/Tokyo' },
  ];

  it.each(changes)('$field: PATCH /onboarding/me with only that field', async (change) => {
    const { client, sent } = clientReturning(PROFILE);
    await patchProfile(change, client);
    expect(await sent()).toEqual({
      method: 'PATCH',
      path: '/onboarding/me',
      body: JSON.stringify({ [change.field]: change.value }),
    });
  });

  it.each([
    ['  Sam  ', { display_name: 'Sam' }],
    ['', { display_name: null }],
    ['   ', { display_name: null }],
  ])('display name %j: PATCH /users/me with only display_name', async (input, body) => {
    const { client, sent } = clientReturning({ id: 1 });
    await patchDisplayName(input, client);
    expect(await sent()).toEqual({ method: 'PATCH', path: '/users/me', body: JSON.stringify(body) });
  });
});

describe('displayNameError', () => {
  it('allows blank and up to 100 characters after trimming', () => {
    expect(displayNameError('')).toBeUndefined();
    expect(displayNameError(` ${'x'.repeat(100)} `)).toBeUndefined();
    expect(displayNameError('x'.repeat(101))).toBe('Use 100 characters or fewer');
  });
});

describe('profile mutation', () => {
  /** Runs the production options in a real QueryClient with a hand-resolved save. */
  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
    client.setQueryData(settingsKeys.profile, PROFILE);
    let resolve!: (p: Profile) => void;
    let reject!: (e: unknown) => void;
    const save = jest.fn(
      () =>
        new Promise<Profile>((res, rej) => {
          resolve = res;
          reject = rej;
        }),
    );
    const onNeedsOnboarding = jest.fn();
    const observer = new MutationObserver(client, profileMutationOptions(client, save, onNeedsOnboarding));
    return {
      client,
      onNeedsOnboarding,
      /** Start a save and wait until its request is out. */
      begin: async (change: ProfileChange) => {
        const promise = observer.mutate(change).catch(() => undefined);
        while (save.mock.calls.length === 0) await new Promise((r) => setTimeout(r, 0));
        return { finished: () => promise };
      },
      resolve: (p: Profile) => resolve(p),
      reject: (e: unknown) => reject(e),
      profile: () => client.getQueryData<Profile>(settingsKeys.profile),
    };
  }

  it('shows the new value at once and keeps what the server stored', async () => {
    const s = setup();
    const run = await s.begin({ field: 'reminder_time', value: '07:30:00' });
    expect(s.profile()).toEqual({ ...PROFILE, reminder_time: '07:30:00' });
    s.resolve({ ...PROFILE, reminder_time: '07:31:00' });
    await run.finished();
    expect(s.profile()?.reminder_time).toBe('07:31:00');
  });

  it('reverts only that field when the save fails', async () => {
    const s = setup();
    const run = await s.begin({ field: 'reminders_enabled', value: false });
    expect(s.profile()?.reminders_enabled).toBe(false);
    // Something else changed meanwhile; the revert must not undo it.
    s.client.setQueryData(settingsKeys.profile, { ...s.profile()!, reminder_time: '06:00:00' });
    s.reject(mapApiError({ operation: 'update_my_profile', cause: new TypeError('offline') }));
    await run.finished();
    expect(s.profile()).toEqual({ ...PROFILE, reminder_time: '06:00:00' });
    expect(s.onNeedsOnboarding).not.toHaveBeenCalled();
  });

  it('a time zone change waits for the server, then reloads plan and progress', async () => {
    const s = setup();
    s.client.setQueryData(planKeys.today, { items: [] });
    s.client.setQueryData(progressKeys.streak, {});
    const run = await s.begin({ field: 'timezone', value: 'Asia/Tokyo' });
    expect(s.profile()?.timezone).toBe('Europe/London');
    s.resolve({ ...PROFILE, timezone: 'Asia/Tokyo' });
    await run.finished();
    expect(s.profile()?.timezone).toBe('Asia/Tokyo');
    expect(s.client.getQueryState(planKeys.today)?.isInvalidated).toBe(true);
    expect(s.client.getQueryState(progressKeys.streak)?.isInvalidated).toBe(true);
  });

  it('a save that finishes after logout does not bring the old profile back', async () => {
    const s = setup();
    const run = await s.begin({ field: 'reminders_enabled', value: false });
    s.client.removeQueries();
    s.resolve(PROFILE);
    await run.finished();
    expect(s.profile()).toBeUndefined();
  });

  it('404 (no profile) opens onboarding', async () => {
    const s = setup();
    const run = await s.begin({ field: 'reminder_time', value: '07:00:00' });
    s.reject(mapApiError({ operation: 'update_my_profile', status: 404, body: { detail: 'x' } }));
    await run.finished();
    expect(s.onNeedsOnboarding).toHaveBeenCalledTimes(1);
  });
});

describe('saveErrorMessage', () => {
  it("uses the server's field message for a 422, the shared copy otherwise", () => {
    const invalid = mapApiError({
      operation: 'update_me',
      status: 422,
      body: { detail: [{ loc: ['body', 'display_name'], msg: 'Too long', type: 'x' }] },
    });
    expect(saveErrorMessage(invalid, 'display_name')).toBe('Too long');
    expect(saveErrorMessage(mapApiError({ operation: 'update_me', status: 500 }), 'display_name')).toBe(
      ERROR_COPY.server,
    );
    expect(saveErrorMessage(mapApiError({ operation: 'update_me', status: 401 }), 'display_name')).toBeUndefined();
    expect(saveErrorMessage(null, 'display_name')).toBeUndefined();
  });
});
