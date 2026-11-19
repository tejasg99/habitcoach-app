/**
 * src/components/ui/Text.tsx
 *
 * The one text component. It applies the type scale from the design doc
 * (display ... micro) in DM Sans and picks its colour from theme tokens, so
 * screens never set fontSize / fontFamily / colour by hand.
 *
 *   <Text variant="title2">Today</Text>
 *   <Text variant="display" tabular>12</Text>        // numbers line up
 *   <Text variant="caption" color="textSecondary">Metadata</Text>
 */

import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type TextVariant, type ThemeColors } from '@/theme';

/** The colour tokens that make sense for text. Keeps screens from picking a fill colour by mistake. */
export type TextColor = Extract<
  keyof ThemeColors,
  | 'textPrimary'
  | 'textSecondary'
  | 'textTertiary'
  | 'accentText'
  | 'onAccent'
  | 'onHero'
  | 'successText'
  | 'warningText'
  | 'dangerText'
>;

export type TextProps = RNTextProps & {
  /** Which row of the type scale to use. Default: `body`. */
  variant?: TextVariant;
  /** Colour token. Default: `textPrimary`. */
  color?: TextColor;
  /** Tabular (equal-width) digits for streaks, percentages and times. */
  tabular?: boolean;
  /**
   * Cap OS font scaling at 130% (design doc 4). Use it for text inside
   * fixed-height elements (tabs, chips, buttons). Off by default so body copy
   * keeps full accessibility scaling.
   */
  capScaling?: boolean;
  /** Override the variant's built-in uppercase (only `micro` is uppercase by default). */
  uppercase?: boolean;
};

export function Text({
  variant = 'body',
  color = 'textPrimary',
  tabular = false,
  capScaling = false,
  uppercase,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const { type, colors } = useTheme();
  const spec = type[variant];

  // Build the style by hand (not StyleSheet.create) because it depends on props.
  const base: TextStyle = {
    // One family per weight: Android can't pick weights from a single family name.
    fontFamily: spec.fontFamily,
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    color: colors[color],
    // Tabular numbers keep digits the same width so counters don't jitter.
    fontVariant: tabular ? ['tabular-nums'] : undefined,
    textTransform: (uppercase ?? spec.uppercase) ? 'uppercase' : undefined,
  };

  return (
    <RNText
      {...rest}
      // An explicit maxFontSizeMultiplier from the caller always wins.
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (capScaling ? 1.3 : undefined)}
      style={[base, style]}
    />
  );
}
