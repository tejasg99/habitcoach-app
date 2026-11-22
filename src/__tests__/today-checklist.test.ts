/**
 * Today's pure helpers: the streak banner state (from the server's streak
 * fields only), the hero counts and copy, and grouping.
 */

import { heroCopy, todayGroups, todaySummary, type TodayItem } from '@/features/today/checklist';
import { streakCopy, streakState } from '@/features/today/streak';

describe('streakState', () => {
  it('no streak when current_streak is 0, whatever completed_today says', () => {
    expect(streakState({ current_streak: 0, completed_today: false })).toBe('none');
    expect(streakState({ current_streak: 0, completed_today: true })).toBe('none');
  });

  it('safe when there is a streak and today is completed', () => {
    expect(streakState({ current_streak: 4, completed_today: true })).toBe('safe');
  });

  it('at risk when there is a streak and today is not completed', () => {
    expect(streakState({ current_streak: 1, completed_today: false })).toBe('atRisk');
    expect(streakState({ current_streak: 30, completed_today: false })).toBe('atRisk');
  });
});

describe('streakCopy', () => {
  it('at risk asks for one item, calmly', () => {
    const copy = streakCopy({ current_streak: 5, completed_today: false, longest_streak: 9 });
    expect(copy).toEqual({ state: 'atRisk', title: '5-day streak', message: 'Check off one item today to keep it going' });
    expect(copy.message).not.toMatch(/!|lose|miss|fail/i);
  });

  it('safe mentions the best streak when it is longer', () => {
    expect(streakCopy({ current_streak: 5, completed_today: true, longest_streak: 12 }).message).toBe(
      'Today counts. Your best is 12 days.',
    );
    expect(streakCopy({ current_streak: 5, completed_today: true, longest_streak: 5 }).message).toBe(
      'Today counts. This is your best run so far.',
    );
  });

  it('no streak invites a start', () => {
    expect(streakCopy({ current_streak: 0, completed_today: false, longest_streak: 3 })).toMatchObject({
      state: 'none',
      title: 'No streak yet',
    });
  });
});

function item(id: number, type: TodayItem['type'], position: number, completed = false): TodayItem {
  return { id, type, position, completed, day_of_week: 0, title: `t${id}`, description: '', target_metric: null, log_id: null };
}

describe('todaySummary and heroCopy', () => {
  it('counts only from the items', () => {
    const items = [item(1, 'meal', 0, true), item(2, 'habit', 1), item(3, 'workout', 2, true)];
    expect(todaySummary(items)).toEqual({ done: 2, total: 3, allDone: false });
    expect(heroCopy(todaySummary(items))).toEqual({ headline: '2 of 3 done', message: '1 left for today' });
  });

  it('all done and none done', () => {
    expect(heroCopy(todaySummary([item(1, 'meal', 0, true)])).message).toBe('Everything for today is checked off');
    expect(heroCopy(todaySummary([item(1, 'meal', 0)])).message).toBe('Start with whichever feels easiest');
    expect(todaySummary([]).allDone).toBe(false);
  });
});

describe('todayGroups', () => {
  it('sorts by position and groups by type in the fixed order', () => {
    const groups = todayGroups([item(1, 'habit', 0), item(2, 'workout', 3), item(3, 'meal', 1), item(4, 'workout', 2)]);
    expect(groups.map((g) => [g.type, g.items.map((i) => i.id)])).toEqual([
      ['workout', [4, 2]],
      ['meal', [3]],
      ['habit', [1]],
    ]);
  });
});
