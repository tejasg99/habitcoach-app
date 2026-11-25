/**
 * src/features/notifications/push.ts
 *
 * The app's one registrar (logic in registrar.ts), wired to expo-notifications,
 * secure storage and the API.
 *
 * The push token is never logged.
 */

import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { AndroidImportance, getExpoPushTokenAsync, setNotificationChannelAsync } from 'expo-notifications';
import { Platform } from 'react-native';

import { apiClient } from '@/api/client';
import { unwrap } from '@/api/errors';
import { savePushToken } from '@/lib/storage';

import { readNotificationPermission } from './permission';
import { unregisterStoredPushToken } from './pushToken';
import { createRegistrar } from './registrar';

/**
 * Must equal `defaultChannel` of the expo-notifications plugin in app.json:
 * the server sends no channel id, so Android uses that default.
 */
export const REMINDER_CHANNEL_ID = 'reminders';

/** extra.eas.projectId in app.json (or the value EAS puts in a build). */
function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Remote push needs a real phone, a development or store build, and a project id. */
export function isPushSupported(): boolean {
  return Device.isDevice && !isRunningInExpoGo() && Boolean(easProjectId());
}

/**
 * Android files every notification under a channel, which the person can
 * manage in system settings. It must exist before the permission is asked for
 * and before the token is requested. Creating it again changes nothing.
 */
export async function prepareReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Daily reminders',
    description: "A nudge when nothing from today's plan is checked off yet",
    // Sound and a status bar icon, no banner over other apps.
    importance: AndroidImportance.DEFAULT,
  });
}

export const pushRegistrar = createRegistrar({
  isSupported: isPushSupported,
  isAllowed: async () => (await readNotificationPermission()) === 'allowed',
  prepareChannel: prepareReminderChannel,
  getToken: async () => (await getExpoPushTokenAsync({ projectId: easProjectId() })).data,
  saveToken: savePushToken,
  register: async (token, signal) => {
    await unwrap('register_push_token', apiClient.POST('/notifications/register-token', { body: { token }, signal }));
  },
});

/**
 * Logout: let a registration under way finish, then unregister the stored
 * token. The signal is logout's time limit; when it fires, both are cancelled.
 */
export async function unregisterPush(signal: AbortSignal): Promise<void> {
  pushRegistrar.stop();
  signal.addEventListener('abort', () => pushRegistrar.abort());
  await pushRegistrar.settled();
  if (signal.aborted) return;
  await unregisterStoredPushToken(signal);
}

/** The session is over without an unregister call (expired, or account deleted). */
export function abandonPush(): void {
  pushRegistrar.stop();
  pushRegistrar.abort();
}
