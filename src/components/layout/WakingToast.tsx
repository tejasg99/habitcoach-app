/**
 * src/components/layout/WakingToast.tsx
 *
 * "Waking up the server..." pill, shown app-wide while any API request has
 * been waiting for more than ~5 s (see src/api/status.ts). The free-tier API
 * sleeps when idle, so the first call can take up to 90 s; this tells the
 * user the app is working rather than broken.
 *
 * Look (design doc 6, Toasts): `surfaceRaised`, pill radius, e3 shadow.
 * Placement: top of the screen under the status bar, so it never covers a
 * form's primary button or the floating tab bar (see Implementation notes).
 * It ignores touches, so it never blocks the screen under it.
 */

import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useServerWaking } from '@/api/status';
import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export function WakingToast() {
  const waking = useServerWaking();
  const insets = useSafeAreaInsets();
  const { colors, motion } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Full-width layer pinned to the top; centres the pill horizontally.
    layer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    // The pill: raised surface, fully rounded, biggest soft shadow.
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.layout.minTap,
      paddingHorizontal: t.spacing[20],
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceRaised,
      ...t.shadows.e3,
    },
    // Space between the small spinner and the text.
    spinner: { marginRight: t.spacing[12] },
  }));

  if (!waking) return null;

  return (
    <View pointerEvents="none" style={[styles.layer, { top: insets.top + 8 }]}>
      {/* A simple fade: no movement, so it is also fine with "reduce motion". */}
      <Animated.View
        entering={FadeIn.duration(motion.transition)}
        exiting={FadeOut.duration(motion.micro)}
        style={styles.pill}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <ActivityIndicator size="small" color={colors.textSecondary} style={styles.spinner} />
        <Text variant="callout" color="textPrimary" capScaling>
          Waking up the server...
        </Text>
      </Animated.View>
    </View>
  );
}
