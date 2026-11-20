/**
 * src/app/(tabs)/settings.tsx
 *
 * Settings tab. PLACEHOLDER until Milestone 7, plus:
 *  - "Copy debug info" (all builds): the brief asks for it in Settings.
 *  - Development builds only:
 *    - "Log out": TEMPORARY client-side logout (deletes the stored tokens).
 *      Milestone 7 replaces it with the real account section, and Milestone 8
 *      adds "unregister the push token" before the tokens are deleted.
 *    - "Open design gallery".
 */

import { type Href, useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { View } from 'react-native';

import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { TabPlaceholder } from '@/components/layout/TabPlaceholder';
import { Button, Card, Text } from '@/components/ui';
import { signOut } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

// The gallery route only exists in dev; cast once so typed routes stay quiet
// if the generated route types are stale.
const GALLERY_HREF = '/gallery' as Href;

export default function SettingsScreen() {
  const router = useRouter();

  const styles = useThemedStyles((t) => ({
    // Card title, then a short note, then the buttons.
    cardTitle: { marginBottom: t.spacing[4] },
    note: { marginBottom: t.spacing[16] },
    // Buttons stacked with the list gap.
    actions: { gap: t.spacing[12] },
    // Space between the two cards: the gap between groups, larger than the
    // gap inside a card.
    stack: { gap: t.spacing[16] },
  }));

  return (
    <TabPlaceholder
      title="Settings"
      icon={Settings}
      emptyTitle="Reminders, timezone and account go here"
      emptyMessage="The full settings screen arrives in Milestone 7."
    >
      <View style={styles.stack}>
        <Card>
          <Text variant="title3" style={styles.cardTitle}>
            Support
          </Text>
          <Text variant="callout" color="textSecondary" style={styles.note}>
            If something goes wrong, copy this and send it with your report.
          </Text>
          <CopyDebugInfo variant="secondary" size="md" fullWidth />
        </Card>

        {__DEV__ ? (
          <Card>
            <Text variant="title3" style={styles.cardTitle}>
              Development only
            </Text>
            <Text variant="callout" color="textSecondary" style={styles.note}>
              Logging out here only removes the saved sign-in from this device.
            </Text>
            <View style={styles.actions}>
              <Button label="Log out" variant="destructive" fullWidth onPress={() => void signOut()} />
              <Button
                label="Open design gallery"
                variant="secondary"
                fullWidth
                onPress={() => router.push(GALLERY_HREF)}
              />
            </View>
          </Card>
        ) : null}
      </View>
    </TabPlaceholder>
  );
}
