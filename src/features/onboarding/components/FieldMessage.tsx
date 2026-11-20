/**
 * src/features/onboarding/components/FieldMessage.tsx
 *
 * An error line for wizard answers that are not text fields (choice cards,
 * the equipment list, the reminder settings). It looks exactly like the
 * message under an Input: a small alert icon plus `caption` text in
 * `dangerText`, so the error never relies on colour alone.
 */

import { View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export function FieldMessage({ message }: { message?: string }) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Icon + text on one row; the text column wraps long messages.
    row: { flexDirection: 'row', alignItems: 'center', marginTop: t.spacing[12] },
    icon: { marginRight: t.spacing[8] },
    text: { flex: 1 },
  }));

  if (!message) return null;

  return (
    // Live region: Android announces the message when it appears.
    <View style={styles.row} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <CircleAlert size={16} strokeWidth={1.75} color={colors.dangerText} style={styles.icon} />
      <Text variant="caption" color="dangerText" style={styles.text}>
        {message}
      </Text>
    </View>
  );
}
