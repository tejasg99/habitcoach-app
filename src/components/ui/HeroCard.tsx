/**
 * src/components/ui/HeroCard.tsx
 *
 * The one gradient on a screen (design doc 3.4 / 6). Two stops from the same
 * hue family, drawn at roughly 135 degrees, with white text on top. Use it at
 * most once per screen; it is never used for buttons, rows or backgrounds.
 *
 * The optional white "glow" from the design doc is intentionally left out:
 * lightening the corner would push white text below 4.5:1 on the lighter
 * accents (e.g. Coral), and the doc marks it optional.
 */

import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, useThemedStyles } from '@/theme';

export type HeroCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function HeroCard({ children, style }: HeroCardProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Extra-large corners; `overflow: hidden` clips the gradient to them.
    hero: {
      borderRadius: t.radius.xl,
      padding: t.layout.heroPadding,
      overflow: 'hidden',
    },
  }));

  return (
    <LinearGradient
      colors={colors.heroGradient}
      // Top-left to bottom-right ~ a 135 degree sweep.
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      {children}
    </LinearGradient>
  );
}
