/**
 * src/components/ui/ProgressRing.tsx
 *
 * Circular progress (design doc 6): 8 px stroke, `accentSoft` track, `accent`
 * progress, round caps, content (usually a number) in the centre. Animates on
 * mount over 600 ms. Exposes its value to screen readers via
 * `accessibilityLabel` (e.g. "3 of 5 habits completed").
 *
 * `progress` is a 0..1 fraction. The app never computes progress itself; the
 * caller passes what the backend reported.
 *
 * `onHero` swaps to a white fill on a translucent white track, for use on the
 * hero gradient where the normal accent colours would vanish.
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme, useThemedStyles } from '@/theme';
import { useProgressAnimation } from './useProgressAnimation';

// Make the SVG Circle animatable so we can drive its dash offset from Reanimated.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ProgressRingProps = {
  /** Fraction from 0 to 1. */
  progress: number;
  /** Outer diameter in px. Default 96. */
  size?: number;
  /** Stroke width in px. Default 8 (design doc). */
  strokeWidth?: number;
  /** Use white-on-translucent colours (for the hero card). */
  onHero?: boolean;
  /** Centre content, e.g. a <Text>. */
  children?: ReactNode;
  /** Screen reader description, e.g. "3 of 5 habits completed". */
  accessibilityLabel: string;
};

export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 8,
  onHero = false,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const animated = useProgressAnimation(progress);

  // Circle geometry: the stroke is centred on the radius, so shrink the radius
  // by half the stroke to keep the whole ring inside `size`.
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Dash trick: a dash as long as the circle, shifted back by the unfinished part.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const styles = useThemedStyles(() => ({
    // Square box that holds the SVG and centres the children on top of it.
    box: { alignItems: 'center', justifyContent: 'center' },
    // Children sit in the middle, layered over the ring.
    center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  }));

  const trackColor = onHero ? colors.onHeroTrack : colors.accentSoft;
  const fillColor = onHero ? colors.onHero : colors.accent;

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, Math.max(0, progress)) * 100) }}
    >
      {/* Rotate -90deg so progress starts at 12 o'clock instead of 3 o'clock. */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}
