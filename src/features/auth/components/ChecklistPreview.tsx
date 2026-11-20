/**
 * src/features/auth/components/ChecklistPreview.tsx
 *
 * The welcome screen's one "moment": a small, static preview of what the app
 * actually gives you, a day's checklist from a plan (one workout, one meal,
 * one habit). It reuses the habit-row anatomy from design doc 6 (28 px round
 * check, `bodyStrong` title, `caption` meta line; a done row keeps full
 * legibility with its title lowered to `textSecondary`, never struck through).
 *
 * It is decoration-free on purpose: no gradient (auth screens have none), no
 * illustration. It is not interactive, so screen readers get one summary
 * label instead of three fake checkboxes.
 */

import { View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Card, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

/** Example content: plausible items of the kinds a generated plan contains. */
const ITEMS = [
  { title: 'Brisk walk', meta: 'Workout · 25 min', done: true },
  { title: 'Oats with yogurt and berries', meta: 'Meal · breakfast', done: false },
  { title: 'Screens off by 10:30 pm', meta: 'Habit', done: false },
] as const;

export function ChecklistPreview() {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Header line of the card ("Today" + count), then space before the rows.
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: t.spacing[16],
    },
    // Rows are stacked with a 12 px gap (list rhythm from the doc).
    rows: { gap: t.spacing[12] },
    // One row: check on the left, text on the right; the inset `surfaceMuted`
    // block separates rows inside the card without lines.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: t.spacing[16],
      borderRadius: t.radius.md,
      backgroundColor: t.colors.surfaceMuted,
    },
    // The 28 px round check. Checked: accent fill. Unchecked: in the real
    // habit row it is `surfaceMuted` on a `surface` row; here the row itself
    // is the muted inset, so the empty check flips to `surface` to stay visible.
    check: {
      width: 28,
      height: 28,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: t.spacing[12],
      backgroundColor: t.colors.surface,
    },
    checkDone: { backgroundColor: t.colors.accent },
    // Text column fills the rest of the row and wraps.
    text: { flex: 1 },
  }));

  const doneCount = ITEMS.filter((i) => i.done).length;

  return (
    <Card
      accessible
      accessibilityLabel={`Example day: ${ITEMS.map((i) => i.title).join(', ')}. ${doneCount} of ${ITEMS.length} done.`}
    >
      <View style={styles.header}>
        <Text variant="title3">Today</Text>
        <Text variant="caption" color="textSecondary" tabular>
          {doneCount} of {ITEMS.length} done
        </Text>
      </View>
      <View style={styles.rows}>
        {ITEMS.map((item) => (
          <View key={item.title} style={styles.row}>
            <View style={[styles.check, item.done && styles.checkDone]}>
              {item.done ? <Check size={16} strokeWidth={2.5} color={colors.onAccent} /> : null}
            </View>
            <View style={styles.text}>
              <Text variant="bodyStrong" color={item.done ? 'textSecondary' : 'textPrimary'}>
                {item.title}
              </Text>
              <Text variant="caption" color="textSecondary">
                {item.meta}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
