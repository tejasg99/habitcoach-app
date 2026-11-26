/**
 * src/components/ui/Button.tsx
 *
 * Pill-shaped button, label in `bodyStrong`, never an outline (design doc 6).
 *
 * Variants:  primary (accent fill) | secondary (muted fill) | soft (accent tint)
 *            | ghost (no fill) | destructive (danger tint)
 *            | neutralDanger (muted fill, red label: leaving without losing data)
 * Sizes:     lg 52 (full-width CTA) | md 44 | sm 36 (never shorter)
 * States:    pressed  = scale 0.98 + darker fill (primary: accentDeep in light,
 *                       90% opacity in dark; others: 90% opacity)
 *            disabled = 40% opacity
 *            loading  = spinner replaces the label but the label stays in the
 *                       layout (invisible), so the button width doesn't jump
 */

import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { Text, type TextColor } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'destructive' | 'neutralDanger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner instead of the label and ignore presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon (Lucide). */
  icon?: LucideIcon;
  /** Stretch to the full width of the parent. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Which fill and label colour each variant uses (all theme tokens). */
const VARIANT_COLORS: Record<ButtonVariant, { fill: keyof ThemeColors | null; label: TextColor }> = {
  primary: { fill: 'accent', label: 'onAccent' },
  secondary: { fill: 'surfaceMuted', label: 'textPrimary' },
  soft: { fill: 'accentSoft', label: 'accentText' },
  ghost: { fill: null, label: 'accentText' },
  destructive: { fill: 'dangerSoft', label: 'dangerText' },
  // Same quiet fill as `secondary`, so only the red words carry the warning.
  neutralDanger: { fill: 'surfaceMuted', label: 'dangerText' },
};

/** Touch area added around `sm` buttons: (44 - 36) / 2 = 4 px above and below. */
const SMALL_HIT_SLOP = { top: 4, bottom: 4 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  fullWidth = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors, mode } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Shared pill shape: centred row, side padding gives the label breathing room.
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      paddingHorizontal: t.spacing[20],
    },
    // The three fixed heights from the design doc.
    lg: { height: 52 },
    md: { height: 44 },
    sm: { height: 36, paddingHorizontal: t.spacing[16] },
    // Stretch variant for full-width calls to action.
    fullWidth: { alignSelf: 'stretch' },
    // Space between a leading icon and the label.
    iconGap: { marginRight: t.spacing[8] },
    // The label row stays laid out while loading (opacity 0) to keep the width.
    hidden: { opacity: 0 },
    // The spinner is centred on top of the (hidden) label.
    spinner: { position: 'absolute' },
    // Disabled = 40% opacity.
    disabled: { opacity: 0.4 },
    // Row that holds the icon and label.
    content: { flexDirection: 'row', alignItems: 'center' },
  }));

  const spec = VARIANT_COLORS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      // The small size is 36 tall; 4 px of extra touch area above and below
      // brings it to the 44 pt minimum without changing how it looks.
      hitSlop={size === 'sm' ? SMALL_HIT_SLOP : undefined}
      style={({ pressed }) => {
        // Pressed fill: primary goes to accentDeep in light mode; in dark mode
        // (and for every other variant) we dim to 90% instead.
        const pressedFill = pressed && variant === 'primary' && mode === 'light';
        return [
          styles.base,
          styles[size],
          fullWidth && styles.fullWidth,
          {
            backgroundColor: spec.fill
              ? pressedFill
                ? colors.accentDeep
                : (colors[spec.fill] as string)
              : 'transparent',
            opacity: pressed && !pressedFill ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          disabled && styles.disabled,
          style,
        ];
      }}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {Icon ? (
          <View style={styles.iconGap}>
            <Icon size={20} strokeWidth={1.75} color={colors[spec.label]} />
          </View>
        ) : null}
        <Text variant="bodyStrong" color={spec.label} capScaling numberOfLines={1}>
          {label}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors[spec.label]} accessibilityLabel="Loading" />
      ) : null}
    </Pressable>
  );
}
