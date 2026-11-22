/**
 * src/features/today/components/TodayHero.tsx
 *
 * The screen's one gradient (design doc 6, "Hero card"): today's headline
 * ("3 of 5 done"), one calm line under it and a progress ring. No action: the
 * checklist right below is the thing to do.
 *
 * Counts come from the Today items (see checklist.ts). The ring shows a tick
 * in its centre once everything is done; otherwise the centre stays empty, as
 * the headline already says the numbers.
 */

import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { HeroCard, ProgressRing, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import { heroCopy, type TodaySummary } from '../checklist';

export function TodayHero({ summary }: { summary: TodaySummary }) {
  const { colors } = useTheme();
  const { headline, message } = heroCopy(summary);
  const progress = summary.total > 0 ? summary.done / summary.total : 0;

  const styles = useThemedStyles((t) => ({
    // Text on the left, ring on the right, centred against each other.
    row: { flexDirection: 'row', alignItems: 'center' },
    // The text column takes the free width and leaves 16 before the ring, so
    // long copy at 130% wraps instead of running under it.
    text: { flex: 1, marginRight: t.spacing[16] },
    // Small gap from the headline to the encouragement line.
    message: { marginTop: t.spacing[4] },
  }));

  return (
    <HeroCard>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="title1" color="onHero" tabular accessibilityRole="header">
            {headline}
          </Text>
          <Text variant="callout" color="onHero" style={styles.message}>
            {message}
          </Text>
        </View>
        <ProgressRing
          progress={progress}
          size={72}
          onHero
          accessibilityLabel={`${summary.done} of ${summary.total} items completed today`}
        >
          {summary.allDone ? <Check size={24} strokeWidth={2.5} color={colors.onHero} /> : null}
        </ProgressRing>
      </View>
    </HeroCard>
  );
}
