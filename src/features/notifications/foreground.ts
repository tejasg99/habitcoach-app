/**
 * src/features/notifications/foreground.ts
 *
 * What happens when a reminder arrives while the app is open: a silent
 * notification that also stays in the notification list. No sound (the person
 * is already here) and no badge (the app never shows one).
 *
 * Imported once by the root layout, for its side effect.
 */

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
