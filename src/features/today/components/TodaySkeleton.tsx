/**
 * src/features/today/components/TodaySkeleton.tsx
 *
 * Loading state for Today (design doc 6: skeleton blocks, no full-screen
 * spinner). The blocks have the same shapes and gaps as the real screen (hero,
 * streak card, a heading and three rows), so nothing jumps when data arrives.
 */

import { View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export function TodaySkeleton() {
  const { radius } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Hero + streak card form one summary block, 12 apart.
    summary: { gap: t.layout.cardGap },
    // Then a section gap before the checklist.
    list: { marginTop: t.layout.sectionGap, gap: t.layout.cardGap },
  }));

  return (
    <View accessible accessibilityLabel="Loading today's plan" accessibilityRole="progressbar">
      <View style={styles.summary}>
        <Skeleton height={120} radius={radius.xl} />
        <Skeleton height={72} radius={radius.lg} />
      </View>
      <View style={styles.list}>
        <Skeleton width="40%" height={24} />
        <Skeleton height={64} radius={radius.md} />
        <Skeleton height={64} radius={radius.md} />
        <Skeleton height={64} radius={radius.md} />
      </View>
    </View>
  );
}
