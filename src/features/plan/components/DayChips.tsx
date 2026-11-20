/**
 * src/features/plan/components/DayChips.tsx
 *
 * The day selector at the top of the Plan tab (design doc 7, "Day chip
 * selector at the top"): Mon to Sun, 0 = Monday like the API.
 *
 * Seven equal pills fill one row instead of a scrolling strip, so the whole
 * week is visible at once on a phone and nothing hides off screen.
 *
 *  - Rest: `surfaceMuted` fill, `textSecondary` label (design doc chip spec)
 *  - Selected: `accentSoft` fill, `accentText` label
 *  - Today: a small accent dot under the pill. It is the Plan tab's one
 *    signature detail, and it only appears when the server told us which
 *    weekday is today (GET /plan/today `weekday`). The screen reader label
 *    says "today" too, so it never relies on the dot alone.
 */

import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { dayName, dayNameShort } from '@/lib/formatting';
import { useThemedStyles } from '@/theme';

import { WEEK_DAYS } from '../week';

export type DayChipsProps = {
  selected: number;
  /** Server-reported weekday of today, or null when unknown (no dot then). */
  today: number | null;
  onSelect: (day: number) => void;
};

export function DayChips({ selected, today, onSelect }: DayChipsProps) {
  const styles = useThemedStyles((t) => ({
    // One row; 4 px gaps keep seven pills on a 335 px wide phone column.
    row: { flexDirection: 'row', gap: t.spacing[4] },
    // Each day takes an equal share of the row; pill and dot stack vertically.
    cell: { flex: 1, alignItems: 'center' },
    // The pill: chip height (36) and shape, label centred. No side padding,
    // the width comes from the row so labels stay centred at 130% text size.
    chip: {
      alignSelf: 'stretch',
      height: 36,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surfaceMuted,
    },
    // Selected day: soft accent tint instead of the muted neutral.
    chipSelected: { backgroundColor: t.colors.accentSoft },
    // Today marker: a 4 px accent dot, 4 px under the pill. Every cell keeps
    // the same space so the row never shifts when today is unknown.
    dot: { width: 4, height: 4, borderRadius: t.radius.pill, marginTop: t.spacing[4] },
    dotOn: { backgroundColor: t.colors.accent },
  }));

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {WEEK_DAYS.map((day) => {
        const isSelected = day === selected;
        const isToday = day === today;
        return (
          <View key={day} style={styles.cell}>
            <Pressable
              onPress={() => {
                if (isSelected) return;
                void Haptics.selectionAsync().catch(() => undefined);
                onSelect(day);
              }}
              accessibilityRole="tab"
              accessibilityLabel={isToday ? `${dayName(day)}, today` : dayName(day)}
              accessibilityState={{ selected: isSelected }}
              // The pill is 36 tall and ~44 wide; 4 px above and below brings
              // the touch area to the 44 pt minimum.
              hitSlop={{ top: 4, bottom: 4 }}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text variant="caption" color={isSelected ? 'accentText' : 'textSecondary'} capScaling numberOfLines={1}>
                {dayNameShort(day)}
              </Text>
            </Pressable>
            <View style={[styles.dot, isToday && styles.dotOn]} />
          </View>
        );
      })}
    </View>
  );
}
