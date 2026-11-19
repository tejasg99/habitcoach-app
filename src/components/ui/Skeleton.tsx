/**
 * src/components/ui/Skeleton.tsx
 *
 * Loading placeholder block (design doc 6): `surfaceMuted` with a gentle
 * pulse. Use these instead of spinners for full screens. With the OS
 * "reduce motion" setting on, the pulse is skipped and the block stays still.
 */

import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemedStyles } from '@/theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  /** Corner radius in px. Default: the design doc's `radiusSm` (12). */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const opacity = useSharedValue(1);

  // Gentle pulse: 100% -> 55% -> 100%, slow and eased. `reduceMotion: System`
  // turns the repeat into a no-op when the user asked for less motion.
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const styles = useThemedStyles((t) => ({
    // A flat muted block. Corner radius defaults to the small token.
    block: { backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.sm },
  }));

  return (
    <Animated.View
      // Hidden from screen readers: it carries no information.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height }, radius !== undefined && { borderRadius: radius }, pulse, style]}
    />
  );
}
