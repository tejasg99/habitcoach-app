/**
 * src/app/(auth)/welcome.tsx
 *
 * First screen for signed-out users. Says plainly what the app does, shows
 * one real-looking preview of a day's checklist (the screen's single "rich"
 * element), then one primary action (create account) and a quiet secondary
 * one (log in). Design doc 7: soft bg, title1, no gradient.
 */

import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen, Text } from '@/components/ui';
import { ChecklistPreview } from '@/features/auth/components/ChecklistPreview';
import { useThemedStyles } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  const styles = useThemedStyles((t) => ({
    // Scroll content fills at least the screen, so the actions can sit at
    // the bottom on tall phones and simply follow the text on short ones.
    content: { flexGrow: 1 },
    // Quiet product name at the top, with air under the status bar.
    brand: { marginTop: t.spacing[24], marginBottom: t.spacing[32] },
    // Preview first, then a section gap before the headline.
    preview: { marginBottom: t.spacing[32] },
    // Headline then supporting paragraph, tight pair.
    headline: { marginBottom: t.spacing[12] },
    // Takes the spare height so the buttons drop to the bottom.
    spacer: { flex: 1, minHeight: t.spacing[32] },
    // Primary + secondary stacked, 12 apart, with space above the home bar.
    actions: { gap: t.spacing[12], marginBottom: t.spacing[16] },
  }));

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text variant="bodyStrong" color="textSecondary" style={styles.brand}>
        Habit coach
      </Text>

      <View style={styles.preview}>
        <ChecklistPreview />
      </View>

      <Text variant="title1" accessibilityRole="header" style={styles.headline}>
        A week of workouts, meals and habits, planned around you
      </Text>
      <Text variant="body" color="textSecondary">
        Tell us your goal, fitness level and what you eat. You get a 7-day plan and a short checklist for each day,
        with a streak that keeps count.
      </Text>

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <Button label="Create account" size="lg" fullWidth onPress={() => router.push('/signup')} />
        <Button label="Log in" variant="ghost" size="lg" fullWidth onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}
