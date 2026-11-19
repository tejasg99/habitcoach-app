/**
 * src/components/ui/Chip.tsx
 *
 * Pill label used for day selectors, categories and filters (design doc 6).
 * Rest: `surfaceMuted` fill + `textSecondary`. Selected: `accentSoft` fill +
 * accent text. Height 36 (32 when `compact`). Font scaling is capped at 130%
 * so the fixed height never clips the label.
 */

import { Pressable } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  /** Omit for a non-interactive label chip. */
  onPress?: () => void;
  /** 32 px tall instead of 36. */
  compact?: boolean;
  /** Optional leading icon (drawn at 20 px, as the design doc specifies for chips). */
  icon?: LucideIcon;
  accessibilityLabel?: string;
};

export function Chip({ label, selected = false, onPress, compact = false, icon: Icon, accessibilityLabel }: ChipProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Pill: fixed height, side padding, content centred in a row.
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start', // hug the content instead of stretching in a column
      height: 36,
      paddingHorizontal: t.spacing[16],
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceMuted,
    },
    // Slightly shorter variant for dense rows.
    compact: { height: 32, paddingHorizontal: t.spacing[12] },
    // Selected chips swap to the accent tint.
    selected: { backgroundColor: t.colors.accentSoft },
    // Gap between icon and label.
    icon: { marginRight: t.spacing[8] },
  }));

  const textColor = selected ? 'accentText' : 'textSecondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      // Visual height is 32-36; extend the touch area toward the 44 px minimum.
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={[styles.chip, compact && styles.compact, selected && styles.selected]}
    >
      {Icon ? <Icon size={20} strokeWidth={1.75} color={colors[textColor]} style={styles.icon} /> : null}
      <Text variant="caption" color={textColor} capScaling numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
