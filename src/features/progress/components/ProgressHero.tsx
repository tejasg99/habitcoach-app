/**
 * src/features/progress/components/ProgressHero.tsx
 *
 * The Progress tab's one gradient (design doc 3.4 allows it on Today and
 * Progress only): the range's total of completed items as the headline, then
 * the current and best streak side by side. Every number is the server's
 * (`total_completed`, `streak.current_streak`, `streak.longest_streak`).
 *
 * Two weights only (design doc 4, "Maximum two weights per card"): bold for
 * the numbers (display, title1), medium for the labels (callout).
 */

import { View } from 'react-native';

import { HeroCard, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import { dayCount } from '../chartData';
import type { Progress } from '../queries';
import { rangePhrase, type ProgressRange } from '../range';

export type ProgressHeroProps = {
  progress: Progress;
  range: ProgressRange;
};

export function ProgressHero({ progress, range }: ProgressHeroProps) {
  const total = progress.total_completed;
  const { current_streak, longest_streak } = progress.streak;
  const totalLine = `${total === 1 ? 'item' : 'items'} checked off in ${rangePhrase(range)}`;

  const styles = useThemedStyles((t) => ({
    // The supporting line sits tight under the big number, like a caption.
    totalLine: { marginTop: t.spacing[4] },
    // The two streak figures share one row, 24 under the headline block so
    // they read as a second group, and 24 apart from each other.
    stats: { flexDirection: 'row', marginTop: t.spacing[24], gap: t.spacing[24] },
    // Each stat takes half the row, so long labels at 130% wrap inside their
    // own half instead of pushing the other stat away.
    stat: { flex: 1 },
  }));

  return (
    <HeroCard>
      <View accessible accessibilityLabel={`${total} ${totalLine}`}>
        <Text variant="display" color="onHero" tabular>
          {total}
        </Text>
        <Text variant="callout" color="onHero" style={styles.totalLine}>
          {totalLine}
        </Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat} accessible accessibilityLabel={`Current streak, ${dayCount(current_streak)}`}>
          <Text variant="title1" color="onHero" tabular>
            {dayCount(current_streak)}
          </Text>
          <Text variant="callout" color="onHero">
            Current streak
          </Text>
        </View>
        <View style={styles.stat} accessible accessibilityLabel={`Best streak, ${dayCount(longest_streak)}`}>
          <Text variant="title1" color="onHero" tabular>
            {dayCount(longest_streak)}
          </Text>
          <Text variant="callout" color="onHero">
            Best streak
          </Text>
        </View>
      </View>
    </HeroCard>
  );
}
