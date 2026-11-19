/**
 * src/components/ui/ProgressBar.tsx
 *
 * Horizontal progress (design doc 6): 8 px high, pill-shaped, `accentSoft`
 * track and `accent` fill, animated on mount over 600 ms. `progress` is a
 * 0..1 fraction supplied by the caller (never computed on the client).
 */

import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useTheme, useThemedStyles } from '@/theme';
import { useProgressAnimation } from './useProgressAnimation';

export type ProgressBarProps = {
  /** Fraction from 0 to 1. */
  progress: number;
  /** White-on-translucent colours, for the hero card. */
  onHero?: boolean;
  /** Screen reader description, e.g. "60 percent of this week completed". */
  accessibilityLabel: string;
};

export function ProgressBar({ progress, onHero = false, accessibilityLabel }: ProgressBarProps) {
  const { colors } = useTheme();
  const animated = useProgressAnimation(progress);

  const styles = useThemedStyles((t) => ({
    // The full-width track. `overflow: hidden` keeps the fill inside the pill.
    track: { height: 8, borderRadius: t.radius.pill, overflow: 'hidden' },
    // The fill: same height and pill shape; its width is animated below.
    fill: { height: 8, borderRadius: t.radius.pill },
  }));

  // Width as a percentage string, driven by the shared value.
  const fillStyle = useAnimatedStyle(() => ({ width: `${animated.value * 100}%` }));

  return (
    <View
      style={[styles.track, { backgroundColor: onHero ? colors.onHeroTrack : colors.accentSoft }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, progress)) * 100) }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: onHero ? colors.onHero : colors.accent }, fillStyle]} />
    </View>
  );
}
