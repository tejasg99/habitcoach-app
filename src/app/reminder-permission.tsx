/**
 * src/app/reminder-permission.tsx
 *
 * Explains the daily reminder before the phone's own permission dialog, which
 * can only be shown once or twice. Opens by itself after onboarding
 * (NotificationsHost) and from Settings.
 *
 *   What it is   (display heading, one line)
 *   [ example reminder ]
 *   When it comes, and where to change it
 *   [ Continue ]   opens the phone's dialog
 *   [ Not now ]
 *
 * Laid out like an onboarding step (design doc 7): one subject, a pinned
 * primary action, no gradient.
 */

import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { ReminderPreview } from '@/features/notifications/components/ReminderPreview';
import { requestNotificationPermission } from '@/features/notifications/permission';
import { prepareReminderChannel, pushRegistrar } from '@/features/notifications/push';
import { useProfile } from '@/features/settings/queries';
import { formatReminderTime } from '@/lib/formatting';
import { useThemedStyles } from '@/theme';

/** Only if the profile is not loaded (normally the startup gate or onboarding has). */
const FALLBACK_TIME = '20:00:00';

export default function ReminderPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const [asking, setAsking] = useState(false);
  // A second tap in the same frame must not open the dialog twice.
  const busy = useRef(false);

  const styles = useThemedStyles((t) => ({
    // Full screen, page background.
    root: { flex: 1, backgroundColor: t.colors.bg },
    // Scrollable middle, so 130% text never pushes the buttons off screen.
    scroll: { flex: 1 },
    // Screen padding at the sides; 24 at the end so the last line does not
    // touch the pinned footer. (The top padding depends on the notch, below.)
    content: { paddingHorizontal: t.layout.screenPadding, paddingBottom: t.spacing[24] },
    // Heading, 8 to the line under it, a section gap to the example.
    title: { marginBottom: t.spacing[8] },
    header: { marginBottom: t.layout.sectionGap },
    // Two plain sentences, 12 apart, a section gap under the example.
    facts: { marginTop: t.layout.sectionGap, gap: t.spacing[12] },
    // Pinned footer: buttons stacked, 12 apart, 16 above the home indicator
    // (the inset is added below).
    footer: { paddingHorizontal: t.layout.screenPadding, paddingTop: t.spacing[8], gap: t.spacing[12] },
  }));

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const ask = async () => {
    if (busy.current) return;
    busy.current = true;
    setAsking(true);
    // Android shows its dialog only once a channel exists.
    await prepareReminderChannel().catch(() => undefined);
    const result = await requestNotificationPermission();
    // Not awaited: the server may be asleep.
    if (result === 'allowed') void pushRegistrar.start();
    close();
  };

  const time = formatReminderTime(profile.data?.reminder_time ?? FALLBACK_TIME);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        // 48 under the status bar, about the height of onboarding's top bar.
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header" style={styles.title}>
            One nudge on quiet days
          </Text>
          <Text variant="callout" color="textSecondary">
            Your phone will ask if this app may send notifications
          </Text>
        </View>

        <ReminderPreview time={time} />

        <View style={styles.facts}>
          <Text variant="body" color="textSecondary">
            It comes only if nothing is checked off that day, and at most once a day.
          </Text>
          <Text variant="body" color="textSecondary">
            You can change the time or turn it off in Settings.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Continue" size="lg" fullWidth loading={asking} onPress={() => void ask()} />
        <Button label="Not now" variant="ghost" size="lg" fullWidth disabled={asking} onPress={close} />
      </View>
    </View>
  );
}
