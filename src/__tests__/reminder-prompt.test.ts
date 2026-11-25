/**
 * Reading the notification permission, when the explanation screen opens by
 * itself, and where a tapped notification leads.
 */

import { PermissionStatus } from 'expo';
import { IosAuthorizationStatus } from 'expo-notifications';

import { toNotificationPermission } from '@/features/notifications/permission';
import { claimReminderPrompt, type ReminderPromptDeps } from '@/features/notifications/reminderPrompt';
import { screenFromData } from '@/features/notifications/tap';

describe('toNotificationPermission', () => {
  const result = (granted: boolean, status: PermissionStatus, canAskAgain: boolean) =>
    toNotificationPermission({ granted, status, canAskAgain });

  it('granted', () => {
    expect(result(true, PermissionStatus.GRANTED, true)).toBe('allowed');
  });

  it('iOS provisional counts as allowed', () => {
    expect(
      toNotificationPermission({
        granted: false,
        status: PermissionStatus.UNDETERMINED,
        canAskAgain: true,
        ios: { status: IosAuthorizationStatus.PROVISIONAL } as never,
      }),
    ).toBe('allowed');
  });

  it('not asked yet, also when Android 13+ calls that denied', () => {
    expect(result(false, PermissionStatus.UNDETERMINED, true)).toBe('askable');
    expect(result(false, PermissionStatus.DENIED, true)).toBe('askable');
  });

  it('denied for good', () => {
    expect(result(false, PermissionStatus.DENIED, false)).toBe('denied');
  });

  it('granted, but switched off in Android settings: only settings can help', () => {
    expect(result(true, PermissionStatus.DENIED, true)).toBe('denied');
  });
});

describe('claimReminderPrompt', () => {
  function deps(overrides: Partial<ReminderPromptDeps> = {}) {
    return {
      isSupported: () => true,
      permission: async () => 'askable' as const,
      me: async () => ({ id: 7 }),
      profile: async () => ({ reminders_enabled: true }),
      readShownTo: async () => null,
      saveShownTo: jest.fn(async () => undefined),
      ...overrides,
    };
  }

  it('opens once, and remembers the account', async () => {
    const d = deps();
    await expect(claimReminderPrompt(d)).resolves.toBe(true);
    expect(d.saveShownTo).toHaveBeenCalledWith('7');
  });

  it('opens for another account on the same phone', async () => {
    await expect(claimReminderPrompt(deps({ readShownTo: async () => '6' }))).resolves.toBe(true);
  });

  it.each<[string, Partial<ReminderPromptDeps>]>([
    ['push is not supported', { isSupported: () => false }],
    ['already allowed', { permission: async () => 'allowed' }],
    ['denied for good', { permission: async () => 'denied' }],
    ['reminders are off', { profile: async () => ({ reminders_enabled: false }) }],
    ['already shown to this account', { readShownTo: async () => '7' }],
    ['the profile cannot be read', { profile: async () => Promise.reject(new Error('offline')) }],
    ['it cannot be remembered', { saveShownTo: async () => Promise.reject(new Error('storage')) }],
  ])('stays closed when %s', async (_name, overrides) => {
    await expect(claimReminderPrompt(deps(overrides))).resolves.toBe(false);
  });
});

describe('screenFromData', () => {
  it('reads the server payload', () => {
    expect(screenFromData({ screen: 'today' })).toBe('today');
  });

  it.each([undefined, null, 'today', {}, { screen: 'settings' }, { screen: 1 }])('ignores %p', (data) => {
    expect(screenFromData(data)).toBeNull();
  });
});
