/**
 * src/features/notifications/components/NotificationsHost.tsx
 *
 * Lives in the tabs layout, so it only runs while someone is signed in and
 * onboarded. Renders nothing. Three jobs:
 *
 *  1. Notification tap -> Today. The last tap is kept by the system, so a tap
 *     that started the app from killed is still there once the startup gate
 *     has opened the tabs.
 *  2. Back in the foreground -> register for push if that has not worked yet
 *     (permission just given in system settings, or offline at launch).
 *  3. Open the explanation screen once (rules in reminderPrompt.ts).
 */

import { useQueryClient } from '@tanstack/react-query';
import { clearLastNotificationResponse, useLastNotificationResponse } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { planKeys } from '@/features/plan/queries';
import { progressKeys } from '@/features/progress/queries';
import { fetchMe, fetchProfile, settingsKeys } from '@/features/settings/queries';
import { getReminderPromptShownTo, saveReminderPromptShownTo } from '@/lib/storage';

import { readNotificationPermission } from '../permission';
import { isPushSupported, pushRegistrar } from '../push';
import { claimReminderPrompt } from '../reminderPrompt';
import { REMINDER_PERMISSION_HREF } from '../routes';
import { screenFromData } from '../tap';

export function NotificationsHost() {
  const client = useQueryClient();
  const router = useRouter();
  const response = useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;
    // Handled once: without this, the same tap would navigate again after a
    // logout and login.
    clearLastNotificationResponse();
    if (screenFromData(response.notification.request.content.data) !== 'today') return;
    // Close a screen open above the tabs first; navigating alone would put a
    // second copy of the tabs on top of it.
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
    // The app may have been in the background since yesterday.
    void client.invalidateQueries({ queryKey: planKeys.today });
    void client.invalidateQueries({ queryKey: progressKeys.streak });
  }, [response, router, client]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pushRegistrar.startIfNeeded();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const open = await claimReminderPrompt({
        isSupported: isPushSupported,
        permission: readNotificationPermission,
        me: () => client.ensureQueryData({ queryKey: settingsKeys.me, queryFn: fetchMe }),
        profile: () => client.ensureQueryData({ queryKey: settingsKeys.profile, queryFn: fetchProfile }),
        readShownTo: getReminderPromptShownTo,
        saveShownTo: saveReminderPromptShownTo,
      });
      if (active && open) router.push(REMINDER_PERMISSION_HREF);
    };
    void check();
    return () => {
      active = false;
    };
  }, [client, router]);

  return null;
}
