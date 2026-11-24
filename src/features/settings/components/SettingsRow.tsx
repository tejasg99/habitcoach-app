/**
 * src/features/settings/components/SettingsRow.tsx
 *
 * A label with its current value, inside a Settings card. It is the same inset
 * block as the onboarding reminder row: `surfaceMuted` with the `md` radius,
 * never a divider line (design doc 6, Cards). With `onPress` it becomes a
 * button with a chevron; without it, it just shows the value.
 */

import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export type SettingsRowProps = {
  label: string;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
  /** For rows that open something under themselves. */
  expanded?: boolean;
  /** Equal-width digits for times. */
  tabular?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function SettingsRow({
  label,
  value,
  onPress,
  disabled = false,
  expanded,
  tabular = false,
  accessibilityLabel,
  accessibilityHint,
}: SettingsRowProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // 52 tall like an input, so it is an easy target; grows with large text.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: t.spacing[16],
      paddingVertical: t.spacing[12],
      borderRadius: t.radius.md,
      backgroundColor: t.colors.surfaceMuted,
    },
    // Press feedback: a slight dim, the same as the habit rows.
    pressed: { opacity: 0.85 },
    // The standard 40% disabled look.
    disabled: { opacity: 0.4 },
    // The label keeps its natural width; the value takes the rest, right
    // aligned, and wraps instead of being cut off.
    label: { marginRight: t.spacing[16] },
    value: { flex: 1, textAlign: 'right' },
    chevron: { marginLeft: t.spacing[8] },
  }));

  const content = (
    <>
      <Text variant="callout" color="textSecondary" style={styles.label}>
        {label}
      </Text>
      <Text variant="bodyStrong" tabular={tabular} style={styles.value}>
        {value}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={accessibilityLabel ?? `${label}, ${value}`}>
        {content}
      </View>
    );
  }

  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${label}, ${value}`}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, expanded }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {content}
      <Chevron size={20} strokeWidth={1.75} color={colors.textSecondary} style={styles.chevron} />
    </Pressable>
  );
}
