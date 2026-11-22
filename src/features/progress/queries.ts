/**
 * src/features/progress/queries.ts
 *
 * Query keys and hooks for progress data. Everything lives under the
 * ['progress'] prefix, so one `invalidateQueries({ queryKey: progressKeys.all })`
 * refreshes every progress range AND the streak together, which is what a log,
 * an undo or a new plan needs.
 *
 *   progressKeys.streak      GET /progress/streak    (StreakRead: numbers only)
 *   progressKeys.range(7)    GET /progress?days=7    (ProgressRead)
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { unwrap } from '@/api/errors';

import type { ProgressRange } from './range';

export const progressKeys = {
  all: ['progress'] as const,
  streak: ['progress', 'streak'] as const,
  range: (days: ProgressRange) => ['progress', 'range', days] as const,
};

export const fetchStreak = () => unwrap('read_streak', apiClient.GET('/progress/streak'));

export type Streak = Awaited<ReturnType<typeof fetchStreak>>;

export function useStreak() {
  return useQuery({ queryKey: progressKeys.streak, queryFn: fetchStreak });
}

export const fetchProgress = (days: ProgressRange) =>
  unwrap('read_progress', apiClient.GET('/progress', { params: { query: { days } } }));

export type Progress = Awaited<ReturnType<typeof fetchProgress>>;
export type ProgressDay = Progress['days'][number];

/**
 * One range at a time. While a newly picked range loads, the previous range's
 * data stays on screen (`keepPreviousData`), so switching never flashes the
 * skeleton; `isPlaceholderData` tells the screen it is showing the old range.
 */
export function useProgress(days: ProgressRange) {
  return useQuery({
    queryKey: progressKeys.range(days),
    queryFn: () => fetchProgress(days),
    placeholderData: keepPreviousData,
  });
}
