/**
 * src/features/today/streak.ts
 *
 * The streak banner's state and copy, read straight from GET /progress/streak
 * (brief, "Streak states"). The client never counts days itself:
 *
 *   current_streak == 0                       -> 'none'
 *   current_streak > 0 and completed_today    -> 'safe'
 *   current_streak > 0 and not completed_today -> 'atRisk' (prompt: log one item)
 *
 * Copy is calm on purpose (design doc 4, "encouraging and plain"): the at-risk
 * state asks for one small step and never mentions losing anything.
 */

import { streakLabel } from '@/lib/formatting';

import type { Streak } from '../progress/queries';

export type StreakState = 'none' | 'safe' | 'atRisk';

export function streakState(streak: Pick<Streak, 'current_streak' | 'completed_today'>): StreakState {
  if (streak.current_streak <= 0) return 'none';
  return streak.completed_today ? 'safe' : 'atRisk';
}

export type StreakCopy = { state: StreakState; title: string; message: string };

export function streakCopy(streak: Pick<Streak, 'current_streak' | 'completed_today' | 'longest_streak'>): StreakCopy {
  const state = streakState(streak);
  const current = streak.current_streak;
  const title = `${current}-day streak`;

  switch (state) {
    case 'none':
      return { state, title: 'No streak yet', message: 'Check off any item today to start one' };
    case 'atRisk':
      return { state, title, message: 'Check off one item today to keep it going' };
    case 'safe':
      return {
        state,
        title,
        message:
          streak.longest_streak > current
            ? `Today counts. Your best is ${streakLabel(streak.longest_streak)}.`
            : 'Today counts. This is your best run so far.',
      };
  }
}
