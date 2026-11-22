/**
 * Progress tab logic: turning GET /progress into chart and heatmap data
 * (null days stay empty, today is "in progress"), the screen reader
 * summaries, the empty check, and the range selector values.
 */

import {
  axisLabels,
  chartSummary,
  heatLevel,
  heatmapSummary,
  isProgressEmpty,
  toChartData,
  toHeatmapWeeks,
  weekdayOf,
} from '@/features/progress/chartData';
import { progressKeys, type Progress } from '@/features/progress/queries';
import {
  DEFAULT_PROGRESS_RANGE,
  isProgressRange,
  PROGRESS_RANGES,
  rangeLabel,
  toProgressRange,
} from '@/features/progress/range';
import { formatShortDate } from '@/lib/formatting';

type Day = Progress['days'][number];

const day = (date: string, planned: number, completed: number, completion_rate: number | null): Day => ({
  day: date,
  planned,
  completed,
  completion_rate,
});

/** A week ending on Sunday 22 November 2026 (the server's today). */
function week(overrides: Partial<Progress> = {}): Progress {
  return {
    start_date: '2026-11-16',
    end_date: '2026-11-22',
    days: [
      day('2026-11-16', 4, 4, 1), // Mon: all done
      day('2026-11-17', 4, 2, 0.5), // Tue: half
      day('2026-11-18', 0, 0, null), // Wed: nothing planned (no plan yet)
      day('2026-11-19', 4, 0, 0), // Thu: planned, nothing done
      day('2026-11-20', 5, 1, 0.2),
      day('2026-11-21', 3, 3, 1),
      day('2026-11-22', 4, 1, 0.25), // Sun: today, partial
    ],
    total_completed: 11,
    active_days: 5,
    streak: { current_streak: 3, longest_streak: 9, last_completed_date: '2026-11-22', completed_today: true },
    ...overrides,
  };
}

describe('toChartData', () => {
  it('marks the server end_date as today and in progress', () => {
    const chart = toChartData(week());
    expect(chart.today).toMatchObject({ day: '2026-11-22', isToday: true, status: 'inProgress' });
    expect(chart.days.filter((d) => d.isToday)).toHaveLength(1);
    expect(chart.days[5]!.status).toBe('planned');
  });

  it('draws null-rate days empty, never as 0%', () => {
    const chart = toChartData(week());
    const wednesday = chart.days[2]!;
    expect(wednesday).toMatchObject({ status: 'noPlan', rate: null, plannedRatio: 0, completedRatio: 0 });
    // A planned day with nothing done is different: its planned bar is drawn.
    const thursday = chart.days[3]!;
    expect(thursday.status).toBe('planned');
    expect(thursday.plannedRatio).toBeGreaterThan(0);
    expect(thursday.completedRatio).toBe(0);
    expect(chart.noPlanDays).toBe(1);
  });

  it('scales every bar to the busiest day', () => {
    const chart = toChartData(week());
    expect(chart.scaleMax).toBe(5);
    expect(chart.days[4]!.plannedRatio).toBe(1);
    expect(chart.days[0]!.plannedRatio).toBeCloseTo(0.8);
    expect(chart.days[1]!.completedRatio).toBeCloseTo(0.4);
  });

  it('keeps bars inside the chart when completed exceeds planned (mid-day plan change)', () => {
    const chart = toChartData(week({ days: [day('2026-11-22', 2, 5, 1)], start_date: '2026-11-22' }));
    expect(chart.scaleMax).toBe(5);
    expect(chart.days[0]!.completedRatio).toBe(1);
  });

  it('a day with nothing planned today is still today, but not in progress', () => {
    const chart = toChartData(week({ days: [day('2026-11-22', 0, 0, null)], start_date: '2026-11-22' }));
    expect(chart.today).toMatchObject({ isToday: true, status: 'noPlan' });
  });

  it('handles an all-empty range with a safe scale', () => {
    const chart = toChartData(week({ days: [day('2026-11-21', 0, 0, null), day('2026-11-22', 0, 0, null)] }));
    expect(chart.scaleMax).toBe(1);
    expect(chart.days.every((d) => d.plannedRatio === 0)).toBe(true);
  });

  it('handles an empty days list', () => {
    expect(toChartData(week({ days: [] }))).toMatchObject({ days: [], today: null, noPlanDays: 0, scaleMax: 1 });
  });
});

describe('weekdayOf', () => {
  it('reads API dates as Monday-first weekdays, independent of the device time zone', () => {
    expect(weekdayOf('2026-11-16')).toBe(0); // Monday
    expect(weekdayOf('2026-11-22')).toBe(6); // Sunday
    expect(weekdayOf('2024-02-29')).toBe(3); // Thursday (leap day)
    expect(weekdayOf('not a date')).toBe(0);
  });
});

describe('axisLabels', () => {
  it('a week labels every bar, today as "Today"', () => {
    expect(axisLabels(toChartData(week()))).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']);
  });

  it('longer ranges label only the two ends', () => {
    const days = Array.from({ length: 30 }, (_, i) => day(`2026-10-${String(i + 1).padStart(2, '0')}`, 1, 1, 1));
    const chart = toChartData(week({ start_date: '2026-10-01', end_date: '2026-10-30', days }));
    expect(axisLabels(chart)).toEqual(['1 Oct', 'Today']);
  });
});

describe('chartSummary', () => {
  it('describes the chart from server values, including today in progress', () => {
    expect(chartSummary(week(), 7)).toBe(
      'Planned and completed items per day, the last 7 days. 11 items completed, on 5 active days. ' +
        '1 day had nothing planned. Today is in progress: 1 of 4 done.',
    );
  });

  it('says when nothing is planned today, and uses singulars', () => {
    const progress = week({
      days: [day('2026-11-21', 1, 1, 1), day('2026-11-22', 0, 0, null)],
      total_completed: 1,
      active_days: 1,
    });
    expect(chartSummary(progress, 30)).toBe(
      'Planned and completed items per day, the last 30 days. 1 item completed, on 1 active day. ' +
        '1 day had nothing planned. Nothing is planned today.',
    );
  });
});

describe('heatmap', () => {
  it('levels: null and 0 are neutral, then four accent steps', () => {
    expect(heatLevel(null)).toBe(0);
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(0.1)).toBe(1);
    expect(heatLevel(0.25)).toBe(1);
    expect(heatLevel(0.5)).toBe(2);
    expect(heatLevel(0.75)).toBe(3);
    expect(heatLevel(0.76)).toBe(4);
    expect(heatLevel(1)).toBe(4);
  });

  it('lays a Monday-to-Sunday week out as one calendar row', () => {
    const weeks = toHeatmapWeeks(toChartData(week()));
    expect(weeks).toHaveLength(1);
    expect(weeks[0]!.map((c) => c?.level)).toEqual([4, 2, 0, 0, 1, 4, 1]);
    expect(weeks[0]![2]).toMatchObject({ status: 'noPlan', level: 0 });
    expect(weeks[0]![6]).toMatchObject({ isToday: true, status: 'inProgress' });
  });

  it('pads the first row before the start and the last row after today', () => {
    // Wednesday 18 to Tuesday 24 November: 2 blanks, 5 days | 2 days, 5 blanks.
    const days = ['18', '19', '20', '21', '22', '23', '24'].map((d) => day(`2026-11-${d}`, 2, 1, 0.5));
    const weeks = toHeatmapWeeks(toChartData(week({ start_date: '2026-11-18', end_date: '2026-11-24', days })));
    expect(weeks).toHaveLength(2);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]!.slice(0, 2)).toEqual([null, null]);
    expect(weeks[1]!.slice(2)).toEqual([null, null, null, null, null]);
    expect(weeks[1]![1]).toMatchObject({ day: '2026-11-24', isToday: true });
  });

  it('summary uses the server streak and active days', () => {
    expect(heatmapSummary(week(), 7)).toBe(
      'Streak calendar, the last 7 days. Active on 5 of 7 days. Current streak 3 days, best 9 days.',
    );
  });
});

describe('isProgressEmpty', () => {
  it('is empty only with no completions and no streak at all', () => {
    const none = { current_streak: 0, longest_streak: 0, last_completed_date: null, completed_today: false };
    expect(isProgressEmpty(week({ total_completed: 0, streak: none }))).toBe(true);
    // Nothing in this range, but a best streak from earlier: show the charts.
    expect(isProgressEmpty(week({ total_completed: 0, streak: { ...none, longest_streak: 4 } }))).toBe(false);
    expect(isProgressEmpty(week())).toBe(false);
  });
});

describe('range selection', () => {
  it('offers exactly 7, 30 and 90 days, all inside the API limit of 1 to 90', () => {
    expect(PROGRESS_RANGES).toEqual([7, 30, 90]);
    expect(PROGRESS_RANGES.every((r) => r >= 1 && r <= 90)).toBe(true);
    expect(DEFAULT_PROGRESS_RANGE).toBe(7);
    expect(PROGRESS_RANGES.map(rangeLabel)).toEqual(['7 days', '30 days', '90 days']);
  });

  it('accepts only the three ranges and falls back to the default', () => {
    expect(isProgressRange(30)).toBe(true);
    expect(isProgressRange(14)).toBe(false);
    expect(isProgressRange('30')).toBe(false);
    expect(toProgressRange(90)).toBe(90);
    expect(toProgressRange(0)).toBe(7);
    expect(toProgressRange(91)).toBe(7);
    expect(toProgressRange(undefined)).toBe(7);
  });

  it('each range has its own cache entry under the shared progress prefix', () => {
    expect(progressKeys.range(7)).toEqual(['progress', 'range', 7]);
    expect(progressKeys.range(7)).not.toEqual(progressKeys.range(30));
    // A log or undo invalidates ['progress'], which covers every range.
    expect(progressKeys.range(90).slice(0, 1)).toEqual(progressKeys.all);
  });
});

describe('formatShortDate', () => {
  it('reads the date as text', () => {
    expect(formatShortDate('2026-11-22')).toBe('22 Nov');
    expect(formatShortDate('2026-01-05')).toBe('5 Jan');
    expect(formatShortDate('bad')).toBe('bad');
  });
});
