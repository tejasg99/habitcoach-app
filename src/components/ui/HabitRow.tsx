/**
 * src/components/ui/HabitRow.tsx
 *
 * The core habit row (design doc 6, "Habit row"): a tappable surface row with
 * a 28 px round check on the left and the item's text beside it.
 *
 *  - Unchecked: the check is an empty `surfaceMuted` circle.
 *  - Checked: the circle fills with `accent` and shows an `onAccent` tick. The
 *    title drops to `textSecondary` but is never struck through, so a done row
 *    stays fully readable.
 *  - Completion motion: the fill fades in over ~200 ms and the circle springs
 *    from 0.9 to 1. With the OS "reduce motion" setting the spring is skipped
 *    and only the fade remains (design doc 8: replace movement with fades).
 *  - `busy` (a request in flight) keeps the row looking normal but tells screen
 *    readers; the caller decides what a tap does while busy.
 *
 * Screen readers get a checkbox with its checked state, so "done" is never
 * conveyed by colour alone (the tick is the visual equivalent).
 */

import { Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, useThemedStyles } from '@/theme';
import { Text } from './Text';

export type HabitRowProps = {
  title: string;
  /** First caption line, e.g. the target ("3 x 12 reps"). */
  caption?: string | null;
  /** Second caption line, e.g. a short description (max two lines). */
  detail?: string | null;
  checked: boolean;
  busy?: boolean;
  onPress: () => void;
};

/** Check fill fade, in ms (design doc: "fill animates in about 200 ms"). */
const FILL_DURATION = 200;

export function HabitRow({ title, caption, detail, checked, busy = false, onPress }: HabitRowProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // 0 = empty circle, 1 = filled. Starts at the current state so rows that are
  // already done when the screen opens do not animate.
  const fill = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (wasChecked.current === checked) return;
    wasChecked.current = checked;
    // The fade always runs: it is the reduce-motion-friendly part.
    fill.value = withTiming(checked ? 1 : 0, { duration: FILL_DURATION, reduceMotion: ReduceMotion.Never });
    if (checked && !reduceMotion) {
      // Small "press in, settle" spring on completion only.
      scale.value = 0.9;
      scale.value = withSpring(1, { damping: 12, stiffness: 260 });
    }
  }, [checked, reduceMotion, fill, scale]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const styles = useThemedStyles((t) => ({
    // The row itself: a `surface` card, list-row corners (16), at least 64 tall,
    // compact padding and the soft e1 lift. Check and text sit side by side,
    // vertically centred.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: t.layout.cardPaddingCompact,
      paddingVertical: t.spacing[12],
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.md,
      ...t.shadows.e1,
    },
    // Press feedback: a slight dim, no movement (works with reduce motion too).
    pressed: { opacity: 0.8 },
    // The 28 px circle. Its resting fill is the muted inset tone; the accent
    // layer below fades in on top of it. 12 px of space before the text.
    check: {
      width: 28,
      height: 28,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceMuted,
      marginRight: t.spacing[12],
      overflow: 'hidden',
    },
    // The accent fill + tick, stretched over the whole circle and centred.
    checkFill: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.accent,
    },
    // The text column takes the rest of the row and wraps freely, so 130% font
    // scaling grows the row instead of clipping it.
    text: { flex: 1 },
    // A little air between the title and its caption lines.
    caption: { marginTop: t.spacing[4] },
  }));

  const label = [title, caption, detail].filter(Boolean).join('. ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, busy }}
      accessibilityHint={busy ? 'Saving' : checked ? 'Double tap to undo' : 'Double tap to mark done'}
    >
      <Animated.View style={[styles.check, checkStyle]}>
        <Animated.View style={[styles.checkFill, fillStyle]}>
          <Check size={16} strokeWidth={2.5} color={colors.onAccent} />
        </Animated.View>
      </Animated.View>
      <View style={styles.text}>
        <Text variant="bodyStrong" color={checked ? 'textSecondary' : 'textPrimary'}>
          {title}
        </Text>
        {caption ? (
          <Text variant="caption" color="textSecondary" style={styles.caption}>
            {caption}
          </Text>
        ) : null}
        {detail ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.caption}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
