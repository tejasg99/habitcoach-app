/**
 * src/components/ui/TabBar.tsx
 *
 * The floating pill tab bar (design doc 6). RENDERING ONLY for now: it takes
 * a list of tabs and the active key, and reports taps. Milestone 2 wires it
 * into Expo Router's `<Tabs tabBar={...}>` by mapping route state to these
 * props.
 *
 * Look: `surfaceRaised` pill, e3 shadow, inset 20 from the sides and 12 above
 * the bottom safe area. The active tab shows its icon in the accent on an
 * `accentSoft` pill, plus a `micro` label. Inactive tabs use `textTertiary`.
 * A light haptic fires when the selection changes.
 */

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme, useThemedStyles } from '@/theme';
import { Text } from './Text';

export type TabBarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type TabBarProps = {
  items: readonly TabBarItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /**
   * true (default): absolutely positioned at the bottom of the screen, as in
   * the real app. false: laid out in normal flow, used by the dev gallery to
   * show it inside a scrolling page.
   */
  floating?: boolean;
};

export function TabBar({ items, activeKey, onSelect, floating = true }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useThemedStyles((t) => ({
    // Floating placement: pinned above the bottom safe area, inset from the sides.
    floating: {
      position: 'absolute',
      left: t.layout.tabBarInset,
      right: t.layout.tabBarInset,
    },
    // The pill itself: raised surface, big shadow (flat in dark mode), tabs in a row.
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surfaceRaised,
      borderRadius: t.radius.pill,
      paddingVertical: t.spacing[8],
      paddingHorizontal: t.spacing[8],
      ...t.shadows.e3,
    },
    // Each tab shares the width equally and stacks icon pill above label.
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: t.layout.minTap },
    // The 56 x 32 highlight behind the icon; transparent when inactive so
    // layout never shifts between states.
    iconPill: {
      width: 56,
      height: 32,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing[4],
    },
    iconPillActive: { backgroundColor: t.colors.accentSoft },
  }));

  return (
    <View style={[floating && styles.floating, floating && { bottom: insets.bottom + 12 }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {items.map((item) => {
          const active = item.key === activeKey;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) {
                  // Light haptic only when the tab actually changes.
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onSelect(item.key);
              }}
            >
              <View style={[styles.iconPill, active && styles.iconPillActive]}>
                <Icon size={24} strokeWidth={1.75} color={active ? colors.accent : colors.textTertiary} />
              </View>
              {/* Sentence case on purpose: tab names are words, not overlines. */}
              <Text variant="micro" uppercase={false} color={active ? 'accentText' : 'textTertiary'} capScaling>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
