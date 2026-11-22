/**
 * src/features/progress/chartData.ts
 *
 * Turns GET /progress into what the Progress tab draws. Pure functions, no
 * React, so the rules below are unit tested.
 *
 * Rules (brief, "Progress"; design doc 3.5):
 *  - Every number comes from the server. Nothing here works out completion,
 *    streaks or which day is today: `completion_rate`, `total_completed`,
 *    `active_days` and the streak are read as given.
 *  - Today is the server's `end_date` (the last entry of `days`, in the
 *    profile's time zone; see backend `services/progress.py`). It is drawn as
 *    "in progress" because the day is not over yet.
 *  - A day with `completion_rate: null` had nothing planned. It is drawn
 *    EMPTY (no bar, neutral heatmap cell), never as 0%.
 *  - A planned day with nothing done (rate 0) shows its planned bar and a
 *    neutral heatmap cell: neutral, not red.
 *
 * The only date maths is finding the weekday of a server date string, to lay
 * the heatmap out as a Monday-first calendar. It parses the text in UTC, so
 * the device time zone cannot shift it.
 */

import { dayNameShort, formatShortDate } from '@/lib/formatting';

import type { Progress, ProgressDay } from './queries';
import { rangePhrase, type ProgressRange } from './range';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** "1 day" / "5 days". */
export function dayCount(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

/** "1 item" / "5 items". */
export function itemCount(n: number): string {
  return n === 1 ? '1 item' : `${n} items`;
}

/**
 * Weekday of an API date ("YYYY-MM-DD"), 0 = Monday like the rest of the API.
 * Parsed in UTC so the phone's time zone never moves the day. Malformed input
 * gives 0 (Monday), which only affects the calendar's first-row offset.
 */
export function weekdayOf(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return 0;
  const sundayFirst = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** No activity ever: nothing completed in the range and no streak, current or best. */
export function isProgressEmpty(progress: Progress): boolean {
  return (
    progress.total_completed === 0 &&
    progress.streak.current_streak === 0 &&
    progress.streak.longest_streak === 0
  );
}

// ---------------------------------------------------------------------------
// Planned vs completed chart
// ---------------------------------------------------------------------------

/**
 * - `noPlan`: nothing was planned (completion_rate null). Drawn empty.
 * - `planned`: a finished day with a plan.
 * - `inProgress`: today, with a plan. The day is not over yet.
 */
export type ChartDayStatus = 'noPlan' | 'planned' | 'inProgress';

export type ChartDay = {
  day: string;
  weekday: number;
  planned: number;
  completed: number;
  rate: number | null;
  status: ChartDayStatus;
  isToday: boolean;
  /** Planned bar height as a share of the chart height (0..1). 0 for noPlan. */
  plannedRatio: number;
  /** Completed bar height as a share of the chart height (0..1). 0 for noPlan. */
  completedRatio: number;
};

export type ChartData = {
  days: ChartDay[];
  /** The count the full chart height stands for (the busiest day; at least 1). */
  scaleMax: number;
  /** The server's today (last day), or null if the response had no days. */
  today: ChartDay | null;
  /** How many days in the range had nothing planned. */
  noPlanDays: number;
  startDate: string;
  endDate: string;
};

function dayStatus(day: ProgressDay, isToday: boolean): ChartDayStatus {
  if (day.completion_rate === null) return 'noPlan';
  return isToday ? 'inProgress' : 'planned';
}

export function toChartData(progress: Progress): ChartData {
  // One shared scale for every bar: the busiest day fills the chart. Completed
  // can exceed planned after a mid-day plan change (the rate is capped at 1.0,
  // the counts are not), so both counts set the scale and no bar overflows.
  const scaleMax = Math.max(
    1,
    ...progress.days.filter((d) => d.completion_rate !== null).map((d) => Math.max(d.planned, d.completed)),
  );

  const days = progress.days.map((d): ChartDay => {
    const isToday = d.day === progress.end_date;
    const status = dayStatus(d, isToday);
    const empty = status === 'noPlan';
    return {
      day: d.day,
      weekday: weekdayOf(d.day),
      planned: d.planned,
      completed: d.completed,
      rate: d.completion_rate,
      status,
      isToday,
      plannedRatio: empty ? 0 : d.planned / scaleMax,
      completedRatio: empty ? 0 : d.completed / scaleMax,
    };
  });

  return {
    days,
    scaleMax,
    today: days.find((d) => d.isToday) ?? null,
    noPlanDays: days.filter((d) => d.status === 'noPlan').length,
    startDate: progress.start_date,
    endDate: progress.end_date,
  };
}

/**
 * Labels under the chart. A week gets one label per bar ("Mon" ... "Today");
 * longer ranges get only the two ends, which is all that fits legibly.
 */
export function axisLabels(chart: ChartData): string[] {
  if (chart.days.length <= 7) {
    return chart.days.map((d) => (d.isToday ? 'Today' : dayNameShort(d.weekday)));
  }
  return [formatShortDate(chart.startDate), 'Today'];
}

/**
 * What a screen reader hears for the chart, built only from server values.
 *
 * @example
 *   "Planned and completed items per day, the last 7 days. 12 items completed,
 *    on 5 active days. 1 day had nothing planned. Today is in progress: 2 of 4 done."
 */
export function chartSummary(progress: Progress, range: ProgressRange): string {
  const chart = toChartData(progress);
  const parts = [
    `Planned and completed items per day, ${rangePhrase(range)}.`,
    `${itemCount(progress.total_completed)} completed, on ${progress.active_days} active ${progress.active_days === 1 ? 'day' : 'days'}.`,
  ];
  if (chart.noPlanDays > 0) {
    parts.push(`${dayCount(chart.noPlanDays)} had nothing planned.`);
  }
  if (chart.today?.status === 'inProgress') {
    parts.push(`Today is in progress: ${chart.today.completed} of ${chart.today.planned} done.`);
  } else if (chart.today?.status === 'noPlan') {
    parts.push('Nothing is planned today.');
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Streak calendar heatmap
// ---------------------------------------------------------------------------

/** 0 = neutral (`surfaceMuted`), 1..4 = the accent at 25 / 50 / 75 / 100%. */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatCell = {
  day: string;
  level: HeatLevel;
  status: ChartDayStatus;
  isToday: boolean;
};

/**
 * Level from the server's completion rate. Nothing planned (null) and nothing
 * done (0) are both level 0: neutral, never a warning colour.
 */
export function heatLevel(rate: number | null): HeatLevel {
  if (rate === null || rate <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(rate * 4))) as HeatLevel;
}

/**
 * The range as a wall calendar: rows are weeks, columns are Monday to Sunday.
 * `null` pads the first row before the range starts and the last row after
 * today, so every row has exactly 7 slots.
 */
export function toHeatmapWeeks(chart: ChartData): (HeatCell | null)[][] {
  if (chart.days.length === 0) return [];
  const cells: (HeatCell | null)[] = Array.from({ length: chart.days[0]!.weekday }, () => null);
  for (const d of chart.days) {
    cells.push({ day: d.day, level: heatLevel(d.rate), status: d.status, isToday: d.isToday });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (HeatCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Screen reader text for the heatmap. */
export function heatmapSummary(progress: Progress, range: ProgressRange): string {
  const { current_streak, longest_streak } = progress.streak;
  return [
    `Streak calendar, ${rangePhrase(range)}.`,
    `Active on ${progress.active_days} of ${dayCount(progress.days.length)}.`,
    `Current streak ${dayCount(current_streak)}, best ${dayCount(longest_streak)}.`,
  ].join(' ');
}
