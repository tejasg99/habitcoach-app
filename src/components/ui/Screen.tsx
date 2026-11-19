/**
 * src/components/ui/Screen.tsx
 *
 * Page wrapper: theme background, safe-area insets (notch, status bar, home
 * indicator) and the standard 20 px side padding. Optionally scrolls.
 *
 *   <Screen scroll>...</Screen>
 *   <Screen padded={false}>...</Screen>   // full-bleed content
 */

import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useThemedStyles } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Default: false. */
  scroll?: boolean;
  /** Apply the 20 px horizontal padding. Default: true. */
  padded?: boolean;
  /**
   * Extra space reserved at the bottom, e.g. so content can scroll above the
   * floating tab bar. Added on top of the safe-area inset.
   */
  bottomSpace?: number;
  /** Extra style for the content container. */
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = false, padded = true, bottomSpace = 0, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { layout } = useTheme();

  // Layout styles shared by both the scrolling and static variants.
  const styles = useThemedStyles((t) => ({
    // Fills the whole screen and paints the page background colour.
    root: { flex: 1, backgroundColor: t.colors.bg },
    // Static content area.
    content: { flex: 1 },
  }));

  // Dynamic (inset-dependent) padding. Top/bottom respect the safe area so
  // nothing hides under the status bar, notch or home indicator.
  const padding: ViewStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom + bottomSpace,
    paddingHorizontal: padded ? layout.screenPadding : 0,
  };

  if (scroll) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.content, padding, contentStyle]}>{children}</View>
    </View>
  );
}
