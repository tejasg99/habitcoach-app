/**
 * src/features/onboarding/components/ChoiceList.tsx
 *
 * A single-choice question as a stack of cards (design doc 7, Onboarding:
 * "chip or card choices"). Used for goal, fitness level and diet.
 *
 * Each option is a card: title (`bodyStrong`) and one line of description
 * (`callout`, secondary), with a round marker on the right.
 *
 *   rest      `surface` card with the soft e1 lift, empty `surfaceMuted` marker
 *   selected  `accentSoft` fill and an accent marker with a tick. The tick
 *             means the state is not shown by colour alone.
 *
 * Screen readers hear a radio group: "Build muscle, radio button, selected".
 */

import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import type { ChoiceLabel } from '../labels';
import { FieldMessage } from './FieldMessage';

export type ChoiceListProps<T extends string> = {
  /** Label map from ../labels.ts; key order is display order. */
  options: Record<T, ChoiceLabel>;
  value: T | undefined;
  onChange: (value: T) => void;
  /** Spoken name of the whole group, e.g. "Goal". */
  accessibilityLabel: string;
  error?: string;
};

export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  error,
}: ChoiceListProps<T>) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Cards stacked with the standard 12 px gap between cards in a list.
    list: { gap: t.layout.cardGap },
    // One option. A card-like surface (radiusLg, e1), but with the compact
    // 16 px padding and a 64 px minimum height so even a short option is a
    // comfortable target. Title block on the left, marker on the right.
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingVertical: t.layout.cardPaddingCompact,
      paddingHorizontal: t.layout.cardPadding,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.surface,
      ...t.shadows.e1,
    },
    // Selected: the accent tint replaces the white surface.
    selected: { backgroundColor: t.colors.accentSoft },
    // Pressed: the same tiny scale-down the buttons use (design doc 6).
    pressed: { transform: [{ scale: 0.98 }] },
    // Title and description take the free width, with a 16 px gap before the marker.
    textColumn: { flex: 1, marginRight: t.spacing[16], gap: t.spacing[4] },
    // The round marker: 24 px, empty muted circle at rest...
    marker: {
      width: 24,
      height: 24,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surfaceMuted,
    },
    // ...filled with the accent (and a tick) when selected.
    markerOn: { backgroundColor: t.colors.accent },
  }));

  const keys = Object.keys(options) as T[];

  return (
    <View>
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
        {keys.map((key) => {
          const selected = key === value;
          const { label, description } = options[key];
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (!selected) void Haptics.selectionAsync();
                onChange(key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={label}
              accessibilityHint={description}
              style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
            >
              <View style={styles.textColumn}>
                <Text variant="bodyStrong">{label}</Text>
                <Text variant="callout" color="textSecondary">
                  {description}
                </Text>
              </View>
              <View style={[styles.marker, selected && styles.markerOn]}>
                {selected ? <Check size={16} strokeWidth={1.75} color={colors.onAccent} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <FieldMessage message={error} />
    </View>
  );
}
