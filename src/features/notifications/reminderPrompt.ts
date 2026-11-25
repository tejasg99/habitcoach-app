/**
 * src/features/notifications/reminderPrompt.ts
 *
 * When the explanation screen (src/app/reminder-permission.tsx) opens by
 * itself: once per account on this phone, the first time the tabs open (so
 * right after onboarding), if reminders are on and the phone can still ask.
 * After that it is only reached from Settings.
 */

import type { NotificationPermission } from './permission';

export type ReminderPromptDeps = {
  isSupported(): boolean;
  permission(): Promise<NotificationPermission>;
  me(): Promise<{ id: number }>;
  profile(): Promise<{ reminders_enabled: boolean }>;
  /** The account id this phone last showed the screen to, as text. */
  readShownTo(): Promise<string | null>;
  saveShownTo(value: string): Promise<void>;
};

/** True = open the screen now; it has been remembered as shown. Any failure means "not this time". */
export async function claimReminderPrompt(deps: ReminderPromptDeps): Promise<boolean> {
  try {
    if (!deps.isSupported() || (await deps.permission()) !== 'askable') return false;
    const [me, profile, shownTo] = await Promise.all([deps.me(), deps.profile(), deps.readShownTo()]);
    if (!profile.reminders_enabled || shownTo === String(me.id)) return false;
    await deps.saveShownTo(String(me.id));
    return true;
  } catch {
    return false;
  }
}
