/**
 * src/features/progress/range.ts
 *
 * The Progress tab's range selector: 7, 30 or 90 days. The value goes straight
 * into GET /progress?days=N (the API accepts any integer from 1 to 90 and
 * answers 422 otherwise), so only these three values are ever sent.
 */

export const PROGRESS_RANGES = [7, 30, 90] as const;

export type ProgressRange = (typeof PROGRESS_RANGES)[number];

/**
 * The range the tab opens on: one week, matching the design doc's "weekly
 * chart" under the hero. The API's own default (30) is not relied on, so the
 * request always says which range it wants.
 */
export const DEFAULT_PROGRESS_RANGE: ProgressRange = 7;

export function isProgressRange(value: unknown): value is ProgressRange {
  return typeof value === 'number' && (PROGRESS_RANGES as readonly number[]).includes(value);
}

/** Anything that is not one of the three ranges falls back to the default. */
export function toProgressRange(value: unknown): ProgressRange {
  return isProgressRange(value) ? value : DEFAULT_PROGRESS_RANGE;
}

/** Chip label: "7 days". */
export function rangeLabel(range: ProgressRange): string {
  return `${range} days`;
}

/** Phrase used in sentences: "the last 7 days". */
export function rangePhrase(range: ProgressRange): string {
  return `the last ${range} days`;
}
