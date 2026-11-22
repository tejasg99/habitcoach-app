/**
 * src/features/plan/week.ts
 *
 * Pure helpers for the Plan tab's week view (brief, Week screen: "Group items
 * by day_of_week, ordered by position").
 *
 *  - Days are 0 = Monday ... 6 = Sunday, the API's convention (Python's
 *    date.weekday()). The client never works out which day is today: that
 *    comes from GET /plan/today's `weekday`.
 *  - Inside a day, items are sorted by `position`, then grouped by `type`.
 *    Groups always come in a fixed order (Workouts, Meals, Habits); inside a
 *    group the coach's `position` order is kept.
 */

import type { PlanItem, PlanItemType } from './queries';

export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type ItemGroup<T extends Pick<PlanItem, 'type' | 'position'> = PlanItem> = {
  type: PlanItemType;
  items: T[];
};

/** The items scheduled for one day, sorted by position (ties keep API order). */
export function itemsForDay<T extends Pick<PlanItem, 'day_of_week' | 'position'>>(items: readonly T[], day: number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.day_of_week === day)
    .sort((a, b) => a.item.position - b.item.position || a.index - b.index)
    .map(({ item }) => item);
}

/** The fixed order of the groups on both the Plan and Today tabs. */
export const GROUP_ORDER: readonly PlanItemType[] = ['workout', 'meal', 'habit'];

/**
 * Groups already-sorted items by type, in GROUP_ORDER. Empty groups are left
 * out, and items keep their order inside a group. An unknown future type would
 * go after the known ones rather than disappear.
 */
export function groupByType<T extends Pick<PlanItem, 'type' | 'position'>>(sortedItems: readonly T[]): ItemGroup<T>[] {
  const groups: ItemGroup<T>[] = [];
  for (const item of sortedItems) {
    const group = groups.find((g) => g.type === item.type);
    if (group) group.items.push(item);
    else groups.push({ type: item.type, items: [item] });
  }
  const rank = (type: PlanItemType) => {
    const index = GROUP_ORDER.indexOf(type);
    return index === -1 ? GROUP_ORDER.length : index;
  };
  // Array sort is stable, so unknown types keep their first-appearance order.
  return groups.sort((a, b) => rank(a.type) - rank(b.type));
}

/** One day of the week, ready to render: sorted by position, grouped by type. */
export function dayGroups<T extends Pick<PlanItem, 'day_of_week' | 'position' | 'type'>>(
  items: readonly T[],
  day: number,
): ItemGroup<T>[] {
  return groupByType(itemsForDay(items, day));
}

/** Section headings per type (plural, since a group can hold several items). */
export const GROUP_LABELS: Record<PlanItemType, string> = {
  workout: 'Workouts',
  meal: 'Meals',
  habit: 'Habits',
};

/**
 * The day the Plan tab shows: the user's pick, else today's weekday from
 * the server, else Monday.
 */
export function resolveSelectedDay(picked: number | null, todayWeekday: number | null | undefined): number {
  if (picked !== null) return picked;
  if (typeof todayWeekday === 'number' && todayWeekday >= 0 && todayWeekday <= 6) return todayWeekday;
  return 0;
}
