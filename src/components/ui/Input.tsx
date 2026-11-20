/**
 * src/components/ui/Input.tsx
 *
 * Filled text field (design doc 6): height 52, `radiusMd`, `surfaceMuted`
 * fill, label above in `caption`, and no border.
 *
 *   rest   : surfaceMuted fill
 *   focus  : fill becomes `surface` and a soft accent glow appears
 *            (accent shadow at 25% opacity, radius 8)
 *   error  : `dangerSoft` fill + an icon and message under the field, so the
 *            error never relies on colour alone
 *
 * The placeholder uses `textSecondary`, not `textTertiary`: tertiary on the
 * muted fill is below 3:1 in light mode, and placeholders must stay readable.
 */

import { useState, type ComponentRef, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme';
import { Text } from './Text';

/** What a ref to an Input points at (the native text field), e.g. for `.focus()`. */
export type InputHandle = ComponentRef<typeof TextInput>;

export type InputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** Error message. When set, the field shows the error state. */
  error?: string;
  /** Lets a form move focus to this field ("next" on the keyboard). React 19 passes refs as props. */
  ref?: Ref<InputHandle>;
};

export function Input({ label, error, onFocus, onBlur, ref, ...rest }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const styles = useThemedStyles((t) => ({
    // Label + field + message stacked, with a small gap under the label.
    wrapper: { alignSelf: 'stretch' },
    label: { marginBottom: t.spacing[8] },
    // The field itself. Fixed height, rounded, filled; no border anywhere.
    field: {
      height: 52,
      borderRadius: t.radius.md,
      paddingHorizontal: t.spacing[16],
      backgroundColor: t.colors.surfaceMuted,
      color: t.colors.textPrimary,
      fontFamily: t.type.body.fontFamily,
      fontSize: t.type.body.fontSize,
    },
    // Focus: lighter fill + accent glow. The glow is a shadow tinted with the
    // accent. iOS draws it directly; Android needs `elevation` (API 28+ also
    // honours the shadow colour).
    focused: {
      backgroundColor: t.colors.surface,
      shadowColor: t.colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    // Error: soft red tint instead of a red outline.
    errorField: { backgroundColor: t.colors.dangerSoft },
    // Message row: icon + text, below the field.
    messageRow: { flexDirection: 'row', alignItems: 'center', marginTop: t.spacing[8] },
    messageIcon: { marginRight: t.spacing[8] },
    messageText: { flex: 1 },
  }));

  return (
    <View style={styles.wrapper}>
      <Text variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...rest}
        ref={ref}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        // Respect OS text scaling for what the user types.
        allowFontScaling
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.field, focused && styles.focused, error ? styles.errorField : null]}
      />
      {error ? (
        // `accessibilityLiveRegion` makes Android announce the message when it appears.
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <CircleAlert size={16} strokeWidth={1.75} color={colors.dangerText} style={styles.messageIcon} />
          <Text variant="caption" color="dangerText" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
