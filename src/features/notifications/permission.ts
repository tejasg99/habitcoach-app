/**
 * src/features/notifications/permission.ts
 *
 * Reads whether the phone lets this app show notifications. Read only: asking
 * for the permission comes with push (Milestone 8).
 *
 * Imports the permissions file directly rather than 'expo-notifications': the
 * package's index also starts push-token listening, which Expo Go on Android
 * does not support.
 */

import { useFocusEffect } from 'expo-router';
import { getPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { IosAuthorizationStatus } from 'expo-notifications/build/NotificationPermissions.types';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

/** 'unknown' = not asked yet, or the phone could not tell. Nothing is shown for it. */
export type NotificationPermission = 'allowed' | 'denied' | 'unknown';

export async function readNotificationPermission(): Promise<NotificationPermission> {
  try {
    const result = await getPermissionsAsync();
    // iOS "provisional" delivers quietly, which still counts as allowed.
    if (result.granted || result.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'allowed';
    // Android 13+ also says "denied" before the app has ever asked; the advice
    // (turn it on in system settings) is right in that case too.
    return result.status === 'denied' ? 'denied' : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** The current permission; re-read on focus and when the person comes back from system settings. */
export function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] = useState<NotificationPermission>('unknown');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const check = async () => {
        const next = await readNotificationPermission();
        if (active) setPermission(next);
      };
      void check();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void check();
      });
      return () => {
        active = false;
        subscription.remove();
      };
    }, []),
  );

  return permission;
}
