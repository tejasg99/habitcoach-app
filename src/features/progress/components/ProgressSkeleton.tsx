/**
 * src/features/progress/components/ProgressSkeleton.tsx
 *
 * Loading state for Progress (design doc 6: skeleton blocks, no full-screen
 * spinner). Same shapes and gaps as the real screen (range chips, hero, chart
 * card, calendar card), so nothing jumps when the data arrives.
 */

import { View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export function ProgressSkeleton() {
  const { radius } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Three chip-sized pills in a row, 8 apart, like the range selector.
    chips: { flexDirection: 'row', gap: t.spacing[8] },
    // The hero sits 16 under the chips (they belong to it).
    hero: { marginTop: t.spacing[16] },
    // The two cards follow at the section gap (32), 12 apart from each other.
    cards: { marginTop: t.layout.sectionGap, gap: t.layout.cardGap },
  }));

  return (
    <View accessible accessibilityLabel="Loading your progress" accessibilityRole="progressbar">
      <View style={styles.chips}>
        <Skeleton width={72} height={36} radius={radius.pill} />
        <Skeleton width={80} height={36} radius={radius.pill} />
        <Skeleton width={80} height={36} radius={radius.pill} />
      </View>
      <Skeleton height={176} radius={radius.xl} style={styles.hero} />
      <View style={styles.cards}>
        <Skeleton height={300} radius={radius.lg} />
        <Skeleton height={220} radius={radius.lg} />
      </View>
    </View>
  );
}
