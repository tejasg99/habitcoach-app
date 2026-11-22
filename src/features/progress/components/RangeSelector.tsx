/**
 * src/features/progress/components/RangeSelector.tsx
 *
 * Three filter chips: 7, 30 and 90 days (design doc 6, "Chips ... used for
 * filters"). Selected = `accentSoft` fill with accent text; the rest stay
 * neutral, so the chips never compete with the chart below them.
 */

import * as Haptics from 'expo-haptics';
import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import { PROGRESS_RANGES, rangeLabel, type ProgressRange } from '../range';

export type RangeSelectorProps = {
  value: ProgressRange;
  onChange: (range: ProgressRange) => void;
};

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  const styles = useThemedStyles((t) => ({
    // Chips in one row, 8 apart: close enough to read as one control, with
    // room for the 4 px hitSlop on each chip so touch areas don't overlap.
    row: { flexDirection: 'row', gap: t.spacing[8] },
  }));

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Time range">
      {PROGRESS_RANGES.map((range) => (
        <Chip
          key={range}
          label={rangeLabel(range)}
          accessibilityLabel={`Last ${range} days`}
          selected={range === value}
          onPress={() => {
            if (range === value) return;
            // Same light selection tick as the Plan tab's day chips.
            void Haptics.selectionAsync().catch(() => undefined);
            onChange(range);
          }}
        />
      ))}
    </View>
  );
}
