/**
 * src/features/onboarding/components/ProgressDots.tsx
 *
 * The wizard's progress dots (design doc 7, Onboarding: "progress dots in
 * accent"). One dot per step:
 *
 *   done     small accent dot
 *   current  a wider accent pill, so "where am I" reads at a glance without
 *            relying on colour alone (shape changes too)
 *   upcoming small `surfaceMuted` dot
 *
 * Screen readers get a single "Step 2 of 5" instead of five unlabeled dots.
 */

import { View } from 'react-native';

import { useThemedStyles } from '@/theme';

export type ProgressDotsProps = {
  /** Zero-based index of the current step. */
  current: number;
  total: number;
};

export function ProgressDots({ current, total }: ProgressDotsProps) {
  const styles = useThemedStyles((t) => ({
    // The dots sit in a row with 8 px between them, centred vertically so the
    // row lines up with the 44 px back button beside it.
    row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[8] },
    // Base dot: 8 x 8 circle (a pill radius turns any size into a circle).
    dot: { width: 8, height: 8, borderRadius: t.radius.pill, backgroundColor: t.colors.surfaceMuted },
    // Steps already answered keep the accent, so progress fills from the left.
    done: { backgroundColor: t.colors.accent },
    // The current step stretches to a 24 px pill (3 dots wide).
    current: { width: 24, backgroundColor: t.colors.accent },
  }));

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i < current && styles.done, i === current && styles.current]} />
      ))}
    </View>
  );
}
