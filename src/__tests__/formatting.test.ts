/**
 * src/__tests__/formatting.test.ts
 *
 * Unit tests for the pure formatting helpers in src/lib/formatting.ts.
 *
 * These tests cover the logic-heavy parts called out in the brief:
 *  "Time-independent formatting helpers" (brief §Testing expectations)
 *
 * No React, no API, no timers — fast and deterministic.
 */

import {
  dayName,
  dayNameShort,
  formatCompletionRate,
  formatReminderTime,
  formatTodayDate,
  itemTypeLabel,
  parseReminderTime,
  reminderTimeToApi,
  streakLabel,
} from '@/lib/formatting';

// ---------------------------------------------------------------------------
// formatReminderTime
// ---------------------------------------------------------------------------
describe('formatReminderTime', () => {
  it('converts midnight correctly', () => {
    expect(formatReminderTime('00:00:00')).toBe('12:00 am');
  });

  it('converts noon correctly', () => {
    expect(formatReminderTime('12:00:00')).toBe('12:00 pm');
  });

  it('converts a morning time', () => {
    expect(formatReminderTime('07:30:00')).toBe('7:30 am');
  });

  it('converts an evening time', () => {
    expect(formatReminderTime('20:00:00')).toBe('8:00 pm');
  });

  it('pads single-digit minutes', () => {
    expect(formatReminderTime('09:05:00')).toBe('9:05 am');
  });
});

// ---------------------------------------------------------------------------
// reminderTimeToApi
// ---------------------------------------------------------------------------
describe('reminderTimeToApi', () => {
  it('formats midnight', () => {
    expect(reminderTimeToApi(0, 0)).toBe('00:00:00');
  });

  it('pads single-digit hours and minutes', () => {
    expect(reminderTimeToApi(7, 5)).toBe('07:05:00');
  });

  it('formats an afternoon time', () => {
    expect(reminderTimeToApi(20, 30)).toBe('20:30:00');
  });
});

// ---------------------------------------------------------------------------
// parseReminderTime
// ---------------------------------------------------------------------------
describe('parseReminderTime', () => {
  it('parses hours and minutes', () => {
    expect(parseReminderTime('20:30:00')).toEqual({ hours: 20, minutes: 30 });
  });

  it('parses midnight', () => {
    expect(parseReminderTime('00:00:00')).toEqual({ hours: 0, minutes: 0 });
  });

  it('round-trips with reminderTimeToApi', () => {
    const original = '14:45:00';
    const parsed = parseReminderTime(original);
    expect(reminderTimeToApi(parsed.hours, parsed.minutes)).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// dayName
// ---------------------------------------------------------------------------
describe('dayName', () => {
  it('returns Monday for 0', () => {
    expect(dayName(0)).toBe('Monday');
  });

  it('returns Sunday for 6', () => {
    expect(dayName(6)).toBe('Sunday');
  });

  it('throws for out-of-range values', () => {
    expect(() => dayName(7)).toThrow(RangeError);
    expect(() => dayName(-1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// dayNameShort
// ---------------------------------------------------------------------------
describe('dayNameShort', () => {
  it('returns Mon for 0', () => {
    expect(dayNameShort(0)).toBe('Mon');
  });

  it('returns Sun for 6', () => {
    expect(dayNameShort(6)).toBe('Sun');
  });

  it('throws for out-of-range values', () => {
    expect(() => dayNameShort(7)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// itemTypeLabel
// ---------------------------------------------------------------------------
describe('itemTypeLabel', () => {
  it('returns Workout for workout', () => {
    expect(itemTypeLabel('workout')).toBe('Workout');
  });

  it('returns Meal for meal', () => {
    expect(itemTypeLabel('meal')).toBe('Meal');
  });

  it('returns Habit for habit', () => {
    expect(itemTypeLabel('habit')).toBe('Habit');
  });

  it('capitalises unknown types as a fallback', () => {
    expect(itemTypeLabel('custom')).toBe('Custom');
  });
});

// ---------------------------------------------------------------------------
// formatCompletionRate
// ---------------------------------------------------------------------------
describe('formatCompletionRate', () => {
  it('returns null for null input (unplanned day)', () => {
    expect(formatCompletionRate(null)).toBeNull();
  });

  it('formats 100%', () => {
    expect(formatCompletionRate(1.0)).toBe('100%');
  });

  it('formats 75%', () => {
    expect(formatCompletionRate(0.75)).toBe('75%');
  });

  it('rounds to nearest integer', () => {
    expect(formatCompletionRate(0.333)).toBe('33%');
    expect(formatCompletionRate(0.666)).toBe('67%');
  });

  it('caps at 100% even if the server sends > 1.0', () => {
    expect(formatCompletionRate(1.5)).toBe('100%');
  });

  it('returns 0% for zero', () => {
    expect(formatCompletionRate(0)).toBe('0%');
  });
});

// ---------------------------------------------------------------------------
// streakLabel
// ---------------------------------------------------------------------------
describe('streakLabel', () => {
  it('returns "No streak yet" for 0', () => {
    expect(streakLabel(0)).toBe('No streak yet');
  });

  it('uses singular for 1 day', () => {
    expect(streakLabel(1)).toBe('1 day');
  });

  it('uses plural for > 1 days', () => {
    expect(streakLabel(5)).toBe('5 days');
    expect(streakLabel(100)).toBe('100 days');
  });
});

// ---------------------------------------------------------------------------
// formatTodayDate
// ---------------------------------------------------------------------------
describe('formatTodayDate', () => {
  it('builds the line from the server weekday and local_date text', () => {
    expect(formatTodayDate(6, '2026-11-22')).toBe('Sunday, 22 November');
    expect(formatTodayDate(0, '2027-01-04')).toBe('Monday, 4 January');
  });

  it('falls back to the day name for a malformed date', () => {
    expect(formatTodayDate(2, '2026-13-01')).toBe('Wednesday');
    expect(formatTodayDate(2, 'garbage')).toBe('Wednesday');
  });
});
