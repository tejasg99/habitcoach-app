/**
 * Week view helpers: items of one day ordered by position, grouped by type
 * (groups in order of first appearance), and which day the tab shows.
 */

import type { PlanItem } from '@/features/plan/queries';
import { dayGroups, groupByType, itemsForDay, resolveSelectedDay } from '@/features/plan/week';

let nextId = 1;
function item(day_of_week: number, position: number, type: PlanItem['type'], title = `${type}-${position}`): PlanItem {
  return { id: nextId++, day_of_week, position, type, title, description: '', target_metric: null };
}

describe('itemsForDay', () => {
  it('keeps only the requested day and sorts by position', () => {
    const items = [item(1, 3, 'habit'), item(0, 2, 'meal'), item(1, 0, 'workout'), item(1, 1, 'meal')];
    expect(itemsForDay(items, 1).map((i) => i.position)).toEqual([0, 1, 3]);
    expect(itemsForDay(items, 0).map((i) => i.position)).toEqual([2]);
    expect(itemsForDay(items, 6)).toEqual([]);
  });

  it('keeps API order for equal positions and does not mutate the input', () => {
    const a = item(2, 1, 'meal', 'a');
    const b = item(2, 1, 'meal', 'b');
    const c = item(2, 0, 'meal', 'c');
    const items = [a, b, c];
    expect(itemsForDay(items, 2).map((i) => i.title)).toEqual(['c', 'a', 'b']);
    expect(items).toEqual([a, b, c]);
  });
});

describe('groupByType', () => {
  it('groups by type, groups in order of first appearance, items keep their order', () => {
    const sorted = [
      item(0, 0, 'meal', 'breakfast'),
      item(0, 1, 'workout', 'run'),
      item(0, 2, 'meal', 'lunch'),
      item(0, 3, 'habit', 'water'),
      item(0, 4, 'workout', 'stretch'),
    ];
    expect(groupByType(sorted).map((g) => [g.type, g.items.map((i) => i.title)])).toEqual([
      ['meal', ['breakfast', 'lunch']],
      ['workout', ['run', 'stretch']],
      ['habit', ['water']],
    ]);
  });

  it('returns no groups for an empty day', () => {
    expect(groupByType([])).toEqual([]);
  });
});

describe('dayGroups', () => {
  it('sorts by position before grouping, whatever order the API used', () => {
    const items = [
      item(4, 5, 'habit', 'sleep'),
      item(4, 2, 'meal', 'lunch'),
      item(3, 0, 'meal', 'other day'),
      item(4, 0, 'workout', 'squats'),
      item(4, 1, 'meal', 'breakfast'),
    ];
    expect(dayGroups(items, 4).map((g) => [g.type, g.items.map((i) => i.title)])).toEqual([
      ['workout', ['squats']],
      ['meal', ['breakfast', 'lunch']],
      ['habit', ['sleep']],
    ]);
  });
});

describe('resolveSelectedDay', () => {
  it("uses the person's pick first, then the server's weekday, then Monday", () => {
    expect(resolveSelectedDay(2, 5)).toBe(2);
    expect(resolveSelectedDay(null, 5)).toBe(5);
    expect(resolveSelectedDay(null, 0)).toBe(0);
    expect(resolveSelectedDay(null, null)).toBe(0);
    expect(resolveSelectedDay(null, undefined)).toBe(0);
    expect(resolveSelectedDay(null, 9)).toBe(0);
  });
});
