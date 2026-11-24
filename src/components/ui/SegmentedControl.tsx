/**
 * src/components/ui/SegmentedControl.tsx
 *
 * A few equal options in one muted pill (design doc 7: the Light / Dark /
 * System control). The selected segment uses the same look as a selected chip:
 * `accentSoft` fill with accent text. Screen readers get a radio group.
 */

import { Pressable, View } from 'react-native';

import { useThemedStyles } from '@/theme';
import { Text } from './Text';

export type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles((t) => ({
    // The track: one muted pill. 4 px of padding leaves an even rim around the
    // selected segment, so it reads as sitting inside the track.
    track: {
      flexDirection: 'row',
      padding: t.spacing[4],
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceMuted,
    },
    // Each segment takes an equal share and is a full 44 px target.
    segment: {
      flex: 1,
      minHeight: t.layout.minTap,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
    },
    // Selected = the accent tint, like a selected chip.
    selected: { backgroundColor: t.colors.accentSoft },
  }));

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text variant="callout" color={selected ? 'accentText' : 'textSecondary'} capScaling numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
