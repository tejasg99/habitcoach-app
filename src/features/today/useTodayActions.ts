/**
 * src/features/today/useTodayActions.ts
 *
 * React glue for logging on Today (logic in logging.ts):
 *  - `toggle(itemId)`: log or undo, ignored while the item is busy
 *  - `busyIds`: items with a request in flight (re-renders when it changes)
 *  - `notice`: the latest short message for the toast, and `dismissNotice`
 *
 * Haptics (design doc 8): light when an item is checked, success when that
 * check completes everything for today. Haptics are not motion, so they stay
 * on with "reduce motion"; the row animation handles that setting itself.
 */

import { useMutationState, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';

import {
  TODAY_LOG_MUTATION_KEY,
  liveLogApi,
  todayLogMutationOptions,
  toggleTodayItem,
  type TodayLogVariables,
} from './logging';

export type TodayNotice = { id: number; message: string };

function completionHaptic(allDoneNow: boolean): void {
  const run = allDoneNow
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  void run.catch(() => undefined);
}

export function useTodayActions() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<TodayNotice | null>(null);

  const options = useMemo(
    () =>
      todayLogMutationOptions(queryClient, liveLogApi, {
        onCompleted: completionHaptic,
        // A new id per message, so the same text twice in a row still re-shows.
        onNotice: (message) => setNotice((prev) => ({ id: (prev?.id ?? 0) + 1, message })),
      }),
    [queryClient],
  );

  const busyList = useMutationState({
    filters: { mutationKey: TODAY_LOG_MUTATION_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as TodayLogVariables).itemId,
  });
  const busyIds = useMemo(() => new Set(busyList), [busyList]);

  const toggle = useCallback((itemId: number) => toggleTodayItem(queryClient, options, itemId), [queryClient, options]);
  const dismissNotice = useCallback(() => setNotice(null), []);

  return { toggle, busyIds, notice, dismissNotice };
}
