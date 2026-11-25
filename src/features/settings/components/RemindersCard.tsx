/**
 * src/features/settings/components/RemindersCard.tsx
 *
 * Reminders: the server-side switch, the time and the time zone. Each is saved
 * on its own with a one-field PATCH.
 *
 * The switch is the server's `reminders_enabled` and works whatever the phone's
 * notification permission is. If the phone does not allow notifications while
 * reminders are on, a neutral note says so. It leads to the explanation screen
 * while the phone can still ask, otherwise to system settings. Switching
 * reminders on opens that screen too.
 *
 * Copy says "around" because reminders go out on a schedule that can run late.
 */

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';

import { Notice } from '@/components/layout/Notice';
import { Button, Card, Text } from '@/components/ui';
import { readNotificationPermission, useNotificationPermission } from '@/features/notifications/permission';
import { REMINDER_PERMISSION_HREF } from '@/features/notifications/routes';
import { FieldMessage } from '@/features/onboarding/components/FieldMessage';
import { dateToTime, timeToDate } from '@/features/onboarding/components/ReminderStep';
import { useDeviceTimeZone } from '@/hooks/useDeviceTimeZone';
import { formatReminderTime } from '@/lib/formatting';
import { sameTimeZone } from '@/lib/timezone';
import { useTheme, useThemedStyles } from '@/theme';

import { saveErrorMessage, useSaveProfile } from '../mutations';
import type { Profile } from '../queries';
import type { TimezoneOffer } from '../timezonePrompt';
import { SettingsRow } from './SettingsRow';
import { TimezoneSheet } from './TimezoneSheet';

export function RemindersCard({ profile, userId }: { profile: Profile; userId: number | undefined }) {
  const { colors, mode } = useTheme();
  const permission = useNotificationPermission();
  const router = useRouter();

  // One mutation per control, so each shows its own error.
  const saveEnabled = useSaveProfile();
  const saveTime = useSaveProfile();

  // iOS only: the inline spinner edits a draft, saved with its button. (The
  // spinner reports every tick while it turns; saving each would flood the API.)
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [zoneOffer, setZoneOffer] = useState<TimezoneOffer | null>(null);

  const styles = useThemedStyles((t) => ({
    // Card title, 16 above the first row.
    title: { marginBottom: t.spacing[16] },
    // Switch row: text on the left, switch on the right.
    switchRow: { flexDirection: 'row', alignItems: 'center' },
    switchText: { flex: 1, marginRight: t.spacing[16], gap: t.spacing[4] },
    // The note about blocked notifications, and the rows, 16 below.
    block: { marginTop: t.spacing[16] },
    // The iOS spinner and its save button, close to the time row they belong to.
    picker: { marginTop: t.spacing[8] },
    // Time zone row and its hint: 12 under the time, like cards in a list.
    zone: { marginTop: t.spacing[12] },
    hint: { marginTop: t.spacing[8] },
    // "Use ..." sits under the hint, left aligned.
    zoneAction: { marginTop: t.spacing[12], alignSelf: 'flex-start' },
  }));

  const enabled = profile.reminders_enabled;
  const time = draftTime ?? profile.reminder_time;
  const timeLabel = formatReminderTime(time);

  const commitTime = (next: string) => {
    if (next !== profile.reminder_time) saveTime.mutate({ field: 'reminder_time', value: next });
  };

  const saveReminders = (next: boolean) => {
    // Taps while a save runs are ignored, so on/off can never cross over.
    if (saveEnabled.isPending) return;
    saveEnabled.mutate(
      { field: 'reminders_enabled', value: next },
      {
        onSuccess: async () => {
          if (next && (await readNotificationPermission()) === 'askable') router.push(REMINDER_PERMISSION_HREF);
        },
      },
    );
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeToDate(profile.reminder_time),
        mode: 'time',
        onValueChange: (_event, date) => commitTime(dateToTime(date)),
      });
    } else {
      setDraftTime((draft) => (draft === null ? profile.reminder_time : null));
    }
  };

  const deviceZone = useDeviceTimeZone();
  const otherZone = deviceZone && !sameTimeZone(deviceZone, profile.timezone) ? deviceZone : null;

  return (
    <Card>
      <Text variant="title3" accessibilityRole="header" style={styles.title}>
        Reminders
      </Text>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text variant="bodyStrong">Daily reminder</Text>
          <Text variant="callout" color="textSecondary">
            {enabled
              ? `Around ${formatReminderTime(profile.reminder_time)}, only if nothing is checked off yet`
              : 'No reminders are sent'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={saveReminders}
          accessibilityLabel="Daily reminder"
          accessibilityState={{ checked: enabled, busy: saveEnabled.isPending }}
          // Track: accent when on, muted when off. Thumb: the ink that sits on
          // the accent when on, secondary grey when off, so it stays visible on
          // the muted track in both modes.
          trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
          ios_backgroundColor={colors.surfaceMuted}
          thumbColor={enabled ? colors.onAccent : colors.textSecondary}
        />
      </View>
      <FieldMessage message={saveErrorMessage(saveEnabled.error, 'reminders_enabled')} />

      {enabled && permission === 'askable' ? (
        <View style={styles.block}>
          <Notice
            tone="neutral"
            title="Notifications aren't set up on this phone"
            message="Reminders are on for your account, but this phone won't show them until you allow notifications."
          >
            <Button
              label="Set up notifications"
              variant="soft"
              size="sm"
              onPress={() => router.push(REMINDER_PERMISSION_HREF)}
            />
          </Notice>
        </View>
      ) : null}

      {enabled && permission === 'denied' ? (
        <View style={styles.block}>
          <Notice
            tone="neutral"
            title="Notifications are off on this phone"
            message="Reminders stay on for your account, but this phone won't show them. Open system settings, choose Notifications and allow them for this app."
          >
            <Button
              label="Open system settings"
              variant="soft"
              size="sm"
              onPress={() => void Linking.openSettings().catch(() => undefined)}
            />
          </Notice>
        </View>
      ) : null}

      <View style={styles.block}>
        <SettingsRow
          label="Remind me around"
          value={timeLabel}
          tabular
          disabled={!enabled || saveTime.isPending}
          expanded={Platform.OS === 'ios' ? draftTime !== null : undefined}
          onPress={openPicker}
          accessibilityLabel={`Reminder time, around ${timeLabel}`}
          accessibilityHint="Opens a time picker"
        />
        {Platform.OS === 'ios' && draftTime !== null && enabled ? (
          <View style={styles.picker}>
            <DateTimePicker
              value={timeToDate(draftTime)}
              mode="time"
              display="spinner"
              themeVariant={mode}
              textColor={colors.textPrimary}
              onValueChange={(_event, date) => setDraftTime(dateToTime(date))}
            />
            <Button
              label="Save time"
              variant="soft"
              fullWidth
              onPress={() => {
                commitTime(draftTime);
                setDraftTime(null);
              }}
            />
          </View>
        ) : null}
        <FieldMessage message={saveErrorMessage(saveTime.error, 'reminder_time')} />
      </View>

      <View style={styles.zone}>
        <SettingsRow label="Time zone" value={profile.timezone} />
        <Text variant="caption" color="textSecondary" style={styles.hint}>
          {otherZone
            ? `This phone is in ${otherZone}`
            : 'Sets which day counts as today, and when reminders arrive'}
        </Text>
        {otherZone && userId !== undefined ? (
          <Button
            label="Change time zone"
            variant="soft"
            size="sm"
            style={styles.zoneAction}
            onPress={() => setZoneOffer({ userId, zone: otherZone, saved: profile.timezone })}
          />
        ) : null}
      </View>

      <TimezoneSheet offer={zoneOffer} onClose={() => setZoneOffer(null)} />
    </Card>
  );
}
