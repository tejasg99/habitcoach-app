/**
 * src/components/ui/Card.tsx
 *
 * `surface` fill, large corners, soft e1 shadow, 20 px padding (16 compact).
 * No border and no divider lines (design doc 6): separate inner groups with
 * space or a `surfaceMuted` inset block.
 *
 * In dark mode the shadow is flat, so the card reads through its tonal step
 * (bg -> surface), exactly as the design doc prescribes.
 */

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/theme';

export type CardProps = ViewProps & {
  children: ReactNode;
  /** 16 px padding instead of 20. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, compact = false, style, ...rest }: CardProps) {
  const styles = useThemedStyles((t) => ({
    // The card body: tonal surface + rounded corners + soft lift.
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      padding: t.layout.cardPadding,
      ...t.shadows.e1,
    },
    // Compact variant only tightens the padding.
    compact: { padding: t.layout.cardPaddingCompact },
  }));

  return (
    <View {...rest} style={[styles.card, compact && styles.compact, style]}>
      {children}
    </View>
  );
}
