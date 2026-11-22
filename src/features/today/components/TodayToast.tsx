/**
 * src/features/today/components/TodayToast.tsx
 *
 * Short message after a log or undo did not go through ("This item changed.
 * Refreshing your day.", "Only today's completions can be undone", offline).
 *
 * Look (design doc 6, Toasts): `surfaceRaised` pill with the e3 shadow, 16
 * above the floating tab bar, gone after 3 s. It fades in and out without
 * moving, which also suits "reduce motion". It ignores touches so it never
 * blocks the rows under it, and it is announced to screen readers.
 */

import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_CLEARANCE } from '@/components/layout/TabPlaceholder';
import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import type { TodayNotice } from '../useTodayActions';

const VISIBLE_MS = 3000;

export function TodayToast({ notice, onDismiss }: { notice: TodayNotice | null; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const { motion } = useTheme();

  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(notice.message);
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  const styles = useThemedStyles((t) => ({
    // Full-width layer pinned above the tab bar; centres the pill and keeps the
    // usual 20 px screen margins so long messages wrap instead of touching edges.
    layer: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: t.layout.screenPadding,
    },
    // The pill: raised surface, fully rounded, biggest soft shadow, at least a
    // tap target tall so one- and two-line messages look the same height.
    pill: {
      minHeight: t.layout.minTap,
      justifyContent: 'center',
      paddingHorizontal: t.spacing[20],
      paddingVertical: t.spacing[12],
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceRaised,
      ...t.shadows.e3,
    },
    // Wrapped messages stay centred inside the pill.
    message: { textAlign: 'center' },
  }));

  if (!notice) return null;

  return (
    // TAB_BAR_CLEARANCE already includes the bar, its 12 px gap and 16 px of air.
    <View pointerEvents="none" style={[styles.layer, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}>
      <Animated.View
        key={notice.id}
        entering={FadeIn.duration(motion.transition)}
        exiting={FadeOut.duration(motion.micro)}
        style={styles.pill}
        accessibilityLiveRegion="polite"
      >
        <Text variant="callout" color="textPrimary" style={styles.message}>
          {notice.message}
        </Text>
      </Animated.View>
    </View>
  );
}
