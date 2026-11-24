/**
 * src/features/settings/components/AppearanceCard.tsx
 *
 * Light / Dark / System and the five accent swatches (design doc 7). Both
 * apply to the whole app on tap, so the screen itself is the live preview.
 * ThemeProvider saves the choice on the device; nothing goes to the server.
 *
 * The swatches are the one colourful thing on this screen.
 */

import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Card, SegmentedControl, Text } from '@/components/ui';
import { ACCENT_KEYS, accents, useTheme, useThemedStyles, type AccentKey, type ModePreference } from '@/theme';

const MODES: readonly { value: ModePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const ACCENT_LABELS: Record<AccentKey, string> = {
  sage: 'Sage',
  coral: 'Coral',
  amber: 'Amber',
  teal: 'Teal',
  rose: 'Rose',
};

export function AppearanceCard() {
  const { mode, modePreference, accent, setModePreference, setAccent } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Card title, 16 above the first control.
    title: { marginBottom: t.spacing[16] },
    // "Accent" on the left and the chosen name on the right, 20 under the mode
    // control so the two choices read as separate groups.
    accentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: t.spacing[20],
      marginBottom: t.spacing[8],
    },
    // Five swatches spread evenly. Wraps on very narrow screens.
    swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    // Each swatch is a 48 px target. Selected, this becomes a muted halo around
    // the colour: a tone, not an outline.
    hit: {
      width: t.spacing[48],
      height: t.spacing[48],
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    halo: { backgroundColor: t.colors.surfaceMuted },
    // The colour itself, 36 across, so 6 px of halo shows all around.
    dot: { width: 36, height: 36, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center' },
  }));

  return (
    <Card>
      <Text variant="title3" accessibilityRole="header" style={styles.title}>
        Appearance
      </Text>
      <SegmentedControl options={MODES} value={modePreference} onChange={setModePreference} accessibilityLabel="Mode" />

      <View style={styles.accentHeader}>
        <Text variant="callout" color="textSecondary">
          Accent
        </Text>
        <Text variant="callout">{ACCENT_LABELS[accent]}</Text>
      </View>
      <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Accent">
        {ACCENT_KEYS.map((key) => {
          const selected = key === accent;
          // Each swatch shows its own accent in the mode the app is in now.
          const swatch = accents[key][mode];
          return (
            <Pressable
              key={key}
              onPress={() => {
                if (selected) return;
                void Haptics.selectionAsync().catch(() => undefined);
                setAccent(key);
              }}
              accessibilityRole="radio"
              accessibilityLabel={ACCENT_LABELS[key]}
              accessibilityState={{ selected, checked: selected }}
              style={[styles.hit, selected && styles.halo]}
            >
              <View style={[styles.dot, { backgroundColor: swatch.accent }]}>
                {/* The tick means the choice never relies on colour alone. */}
                {selected ? <Check size={20} strokeWidth={1.75} color={swatch.onAccent} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
