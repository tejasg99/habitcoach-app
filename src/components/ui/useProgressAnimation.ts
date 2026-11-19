/**
 * src/components/ui/useProgressAnimation.ts
 *
 * Shared animation for ProgressRing and ProgressBar: a Reanimated value that
 * eases from 0 to the target on mount and between later updates, over 600 ms
 * with ease-out (design doc 6 and 8). With the OS "reduce motion" setting on,
 * it jumps straight to the value.
 */

import { useEffect } from 'react';
import { Easing, ReduceMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

/** `value` is a fraction from 0 to 1 supplied by the server, never computed here. */
export function useProgressAnimation(value: number): SharedValue<number> {
  const progress = useSharedValue(0);
  const clamped = Math.min(1, Math.max(0, value));

  useEffect(() => {
    progress.value = withTiming(clamped, {
      duration: motion.progress,
      easing: Easing.out(Easing.cubic),
      // System = respect the OS reduce-motion setting (no animation when on).
      reduceMotion: ReduceMotion.System,
    });
  }, [clamped, progress]);

  return progress;
}
