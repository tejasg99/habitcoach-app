/**
 * src/features/today/checklist.ts
 *
 * Pure helpers for the Today checklist and hero card.
 *
 *  - Counts come only from the items GET /plan/today returned (each has a
 *    server-set `completed`). No dates, no streak maths.
 *  - Items are sorted by `position` and grouped by type with the same rule as
 *    the Plan tab (fixed Workouts, Meals, Habits order), so the two tabs always
 *    list a day the same way.
 */

import type { TodayPlan } from '../plan/queries';
import { groupByType, type ItemGroup } from '../plan/week';

export type TodayItem = TodayPlan['items'][number];

export type TodaySummary = { done: number; total: number; allDone: boolean };

export function todaySummary(items: readonly Pick<TodayItem, 'completed'>[]): TodaySummary {
  const total = items.length;
  const done = items.filter((item) => item.completed).length;
  return { done, total, allDone: total > 0 && done === total };
}

/** Sorted by position (ties keep API order), then grouped by type. */
export function todayGroups(items: readonly TodayItem[]): ItemGroup<TodayItem>[] {
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.position - b.item.position || a.index - b.index)
    .map(({ item }) => item);
  return groupByType(sorted);
}

/** The hero's headline and the one line under it. */
export function heroCopy({ done, total, allDone }: TodaySummary): { headline: string; message: string } {
  const headline = `${done} of ${total} done`;
  if (allDone) return { headline, message: 'Everything for today is checked off' };
  if (done === 0) return { headline, message: 'Start with whichever feels easiest' };
  const left = total - done;
  return { headline, message: `${left} left for today` };
}
