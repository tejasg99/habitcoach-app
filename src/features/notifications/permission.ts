/**
 * src/features/notifications/permission.ts
 *
 * Whether the phone lets this app show notifications, and asking for it.
 * Asking is always preceded by src/app/reminder-permission.tsx.
 */

import {
  getPermissionsAsync,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  type NotificationPermissionsStatus,
} from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

/**
 * allowed   notifications can be shown
 * askable   not allowed, but the phone's own dialog can still be shown
 * denied    only system settings can turn them on
 * unknown   the phone could not tell; nothing is shown for it
 */
export type NotificationPermission = 'allowed' | 'askable' | 'denied' | 'unknown';

export function toNotificationPermission(
  result: Pick<NotificationPermissionsStatus, 'granted' | 'status' | 'canAskAgain' | 'ios'>,
): NotificationPermission {
  // `status`, not `granted`: Android can report the permission as granted
  // while the app's notifications are switched off in system settings.
  // iOS "provisional" delivers quietly, which still counts as allowed.
  if (result.status === 'granted' || result.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'allowed';
  // Android 13+ says "denied" before the app has ever asked, so `canAskAgain`
  // decides. With the permission already granted there is nothing left to ask.
  return result.canAskAgain && !result.granted ? 'askable' : 'denied';
}

/** Never shows a dialog. */
export async function readNotificationPermission(): Promise<NotificationPermission> {
  try {
    return toNotificationPermission(await getPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

/** Shows the phone's dialog. No badge is asked for: the app never shows one. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    return toNotificationPermission(
      await requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
    );
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
