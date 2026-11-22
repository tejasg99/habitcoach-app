/**
 * src/features/today/components/StreakBanner.tsx
 *
 * The streak line under the hero, in one of three states read from
 * GET /progress/streak (see streak.ts): no streak, safe, at risk.
 *
 * Look: a compact `surface` card with a flame in an `accentSoft` circle (the
 * design doc's "streak flames" progress visual). All three states use the same
 * calm look; the at-risk state differs only in its words, which ask for one
 * item. No warning or danger colours: missing a day is not an error.
 */

import { Flame } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import type { Streak } from '../../progress/queries';
import { streakCopy } from '../streak';

export function StreakBanner({ streak }: { streak: Streak }) {
  const { colors } = useTheme();
  const copy = streakCopy(streak);

  const styles = useThemedStyles((t) => ({
    // Icon and text side by side, vertically centred.
    row: { flexDirection: 'row', alignItems: 'center' },
    // 40 px soft accent circle holding the 20 px flame, 12 before the text.
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: t.spacing[12],
    },
    // The text column wraps in the remaining width.
    text: { flex: 1 },
  }));

  return (
    <Card compact accessible accessibilityLabel={`${copy.title}. ${copy.message}`}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Flame size={20} strokeWidth={1.75} color={copy.state === 'none' ? colors.textSecondary : colors.accentText} />
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong" tabular>
            {copy.title}
          </Text>
          <Text variant="callout" color="textSecondary">
            {copy.message}
          </Text>
        </View>
      </View>
    </Card>
  );
}
