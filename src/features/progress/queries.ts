/**
 * src/features/progress/queries.ts
 *
 * Query keys and hooks for progress data. Everything lives under the
 * ['progress'] prefix, so one `invalidateQueries({ queryKey: progressKeys.all })`
 * refreshes the progress ranges (Milestone 6) AND the streak together, which is
 * what a log, an undo or a new plan needs.
 *
 *   progressKeys.streak   GET /progress/streak  (StreakRead: numbers only)
 */

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { unwrap } from '@/api/errors';

export const progressKeys = {
  all: ['progress'] as const,
  streak: ['progress', 'streak'] as const,
};

export const fetchStreak = () => unwrap('read_streak', apiClient.GET('/progress/streak'));

export type Streak = Awaited<ReturnType<typeof fetchStreak>>;

export function useStreak() {
  return useQuery({ queryKey: progressKeys.streak, queryFn: fetchStreak });
}
