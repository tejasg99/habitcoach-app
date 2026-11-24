/**
 * src/features/onboarding/components/ReminderStep.tsx
 *
 * Reminder on/off, reminder time and the device time zone, in one card.
 *
 *   ┌ Daily reminder                    [switch] ┐
 *   │ ┌ Remind me around         8:00 pm  ›  ┐   │   muted inset block, opens the time picker
 *   │ └──────────────────────────────────────┘   │
 *   └────────────────────────────────────────────┘
 *   Times follow this phone's time zone, Europe/London
 *
 * The reminder time is local wall-clock time, kept as "HH:MM:SS" (the API's
 * format). The picker works on a Date only to show the clock face; no date
 * ever leaves this component.
 *
 * Copy says "around" because the server sends reminders on a schedule that
 * can be a little late (brief: Reminders).
 *
 * Picker per platform:
 *   Android  the system time dialog (DateTimePickerAndroid.open)
 *   iOS      an inline spinner that opens under the row
 */

import { useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { Card, Text } from '@/components/ui';
import { formatReminderTime, parseReminderTime, reminderTimeToApi } from '@/lib/formatting';
import { useTheme, useThemedStyles } from '@/theme';

import { FieldMessage } from './FieldMessage';

export type ReminderStepProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** "HH:MM:SS" */
  time: string;
  onTimeChange: (time: string) => void;
  timezone: string;
  errors: { enabled?: string; time?: string; timezone?: string };
};

/** "HH:MM:SS" -> a Date on a fixed day with that wall-clock time (picker input only). */
export function timeToDate(time: string): Date {
  const { hours, minutes } = parseReminderTime(time);
  return new Date(2000, 0, 1, hours, minutes, 0);
}

/** The picker's Date -> "HH:MM:SS" from its local hours and minutes. */
export function dateToTime(date: Date): string {
  return reminderTimeToApi(date.getHours(), date.getMinutes());
}

export function ReminderStep({
  enabled,
  onEnabledChange,
  time,
  onTimeChange,
  timezone,
  errors,
}: ReminderStepProps) {
  const { colors, mode } = useTheme();
  // iOS only: whether the inline spinner is open.
  const [iosPickerOpen, setIosPickerOpen] = useState(false);

  const styles = useThemedStyles((t) => ({
    // Switch row: label column on the left, switch on the right.
    switchRow: { flexDirection: 'row', alignItems: 'center' },
    switchText: { flex: 1, marginRight: t.spacing[16], gap: t.spacing[4] },
    // The time row is an inset block inside the card (design doc 6: separate
    // inner groups with a `surfaceMuted` inset, never a divider line). It uses
    // the smaller `md` radius (16) so it nests inside the card's 24 px corners.
    // 52 px tall, like an input, so it is an easy target.
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      marginTop: t.spacing[20],
      paddingHorizontal: t.spacing[16],
      borderRadius: t.radius.md,
      backgroundColor: t.colors.surfaceMuted,
    },
    // Reminders off: the time stays visible (it is still saved) but dimmed
    // to the standard 40% disabled opacity.
    dimmed: { opacity: 0.4 },
    timeLabel: { flex: 1 },
    timeValue: { marginRight: t.spacing[8] },
    // The iOS spinner sits under the time row with a little air above it.
    picker: { marginTop: t.spacing[8] },
    // Time zone note below the card, separated like a caption.
    note: { marginTop: t.spacing[16] },
  }));

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: timeToDate(time),
        mode: 'time',
        onValueChange: (_event, date) => onTimeChange(dateToTime(date)),
      });
    } else {
      setIosPickerOpen((open) => !open);
    }
  };

  const timeLabel = formatReminderTime(time);
  const Chevron = iosPickerOpen ? ChevronDown : ChevronRight;

  return (
    <View>
      <Card>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="bodyStrong">Daily reminder</Text>
            <Text variant="callout" color="textSecondary">
              {enabled ? 'A short nudge to log something' : 'You can turn it on later in Settings'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={onEnabledChange}
            accessibilityLabel="Daily reminder"
            // Track: accent when on, muted when off. Thumb: the ink that sits
            // on the accent when on, and secondary text grey when off, so it
            // stays visible on the muted track in both modes.
            trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
            ios_backgroundColor={colors.surfaceMuted}
            thumbColor={enabled ? colors.onAccent : colors.textSecondary}
          />
        </View>

        <Pressable
          onPress={openPicker}
          disabled={!enabled}
          accessibilityRole="button"
          accessibilityLabel={`Reminder time, around ${timeLabel}`}
          accessibilityHint="Opens a time picker"
          accessibilityState={{ disabled: !enabled, expanded: Platform.OS === 'ios' ? iosPickerOpen : undefined }}
          style={[styles.timeRow, !enabled && styles.dimmed]}
        >
          <Text variant="callout" color="textSecondary" style={styles.timeLabel}>
            Remind me around
          </Text>
          <Text variant="bodyStrong" tabular style={styles.timeValue}>
            {timeLabel}
          </Text>
          <Chevron size={20} strokeWidth={1.75} color={colors.textSecondary} />
        </Pressable>

        {Platform.OS === 'ios' && iosPickerOpen && enabled ? (
          <DateTimePicker
            value={timeToDate(time)}
            mode="time"
            display="spinner"
            themeVariant={mode}
            textColor={colors.textPrimary}
            onValueChange={(_event, date) => onTimeChange(dateToTime(date))}
            style={styles.picker}
          />
        ) : null}

        <FieldMessage message={errors.enabled ?? errors.time} />
      </Card>

      <Text variant="caption" color="textSecondary" style={styles.note}>
        {`Times follow this phone's time zone, ${timezone}`}
      </Text>
      <FieldMessage message={errors.timezone} />
    </View>
  );
}
