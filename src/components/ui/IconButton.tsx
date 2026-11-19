/**
 * src/components/ui/IconButton.tsx
 *
 * 44 x 44 circle with a 22 px Lucide icon (design doc 6). Default fill is
 * `surfaceMuted`; use `raised` over images and gradients, where it takes the
 * `surfaceRaised` fill plus the e1 shadow so it stays visible.
 *
 * `accessibilityLabel` is required: an icon alone tells a screen reader nothing.
 */

import { Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme';

export type IconButtonProps = {
  icon: LucideIcon;
  onPress?: () => void;
  accessibilityLabel: string;
  /** `raised` for use on top of gradients and photos. */
  variant?: 'muted' | 'raised';
  disabled?: boolean;
};

export function IconButton({ icon: Icon, onPress, accessibilityLabel, variant = 'muted', disabled = false }: IconButtonProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // A 44 px circle: also the minimum tap target.
    base: {
      width: t.layout.minTap,
      height: t.layout.minTap,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surfaceMuted,
    },
    // Floating look: lighter fill + soft shadow (flat in dark mode by design).
    raised: { backgroundColor: t.colors.surfaceRaised, ...t.shadows.e1 },
    disabled: { opacity: 0.4 },
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'raised' && styles.raised,
        // Quick press feedback: dim + tiny shrink.
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        disabled && styles.disabled,
      ]}
    >
      <Icon size={22} strokeWidth={1.75} color={colors.textPrimary} />
    </Pressable>
  );
}
