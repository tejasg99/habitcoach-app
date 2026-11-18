/**
 * src/lib/formatting.ts
 *
 * Pure, time-independent formatting helpers.
 *
 * Rules:
 *  - No Date.now() or new Date() calls without an explicit input — these are
 *    testable pure functions that take their inputs as arguments.
 *  - No streak/progress computation — the server owns that (brief §Conventions).
 *  - No API calls — just string/number transforms.
 *
 * All helpers are exported individually so tree-shaking keeps the bundle lean.
 */

// ---------------------------------------------------------------------------
// Reminder time
// ---------------------------------------------------------------------------

/**
 * Converts an API reminder_time string ("HH:MM:SS") to a human-readable
 * wall-clock label ("8:30 pm", "12:00 pm").
 *
 * The brief says to describe reminders as "around X" rather than "at X" because
 * delivery is approximate (server job runs every ~15 min). The "around" prefix
 * is added at the call site in the UI copy, not here, so this helper stays reusable.
 *
 * @example
 *   formatReminderTime('20:00:00') // "8:00 pm"
 *   formatReminderTime('07:30:00') // "7:30 am"
 *   formatReminderTime('12:00:00') // "12:00 pm"
 */
export function formatReminderTime(hhmmss: string): string {
  const [hourStr, minuteStr] = hhmmss.split(':');
  const hour = parseInt(hourStr ?? '0', 10);
  const minute = parseInt(minuteStr ?? '0', 10);

  const period = hour < 12 ? 'am' : 'pm';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, '0');

  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Converts a Date object (or hours + minutes numbers) to the "HH:MM:SS" string
 * the API expects for reminder_time.
 *
 * @example
 *   reminderTimeToApi(20, 30) // "20:30:00"
 *   reminderTimeToApi(7, 5)   // "07:05:00"
 */
export function reminderTimeToApi(hours: number, minutes: number): string {
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}:00`;
}

/**
 * Parses a "HH:MM:SS" reminder_time string into { hours, minutes }.
 * Useful for pre-filling a time picker.
 *
 * @example
 *   parseReminderTime('20:30:00') // { hours: 20, minutes: 30 }
 */
export function parseReminderTime(hhmmss: string): { hours: number; minutes: number } {
  const [hourStr, minuteStr] = hhmmss.split(':');
  return {
    hours: parseInt(hourStr ?? '0', 10),
    minutes: parseInt(minuteStr ?? '0', 10),
  };
}

// ---------------------------------------------------------------------------
// Day of week
// ---------------------------------------------------------------------------

/** Full day names indexed 0 (Monday) → 6 (Sunday) — matching the API convention. */
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Short day names indexed 0 (Monday) → 6 (Sunday). */
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Returns the full day name for a weekday index (0 = Monday, 6 = Sunday).
 * Throws for out-of-range values.
 *
 * @example
 *   dayName(0) // "Monday"
 *   dayName(6) // "Sunday"
 */
export function dayName(dayOfWeek: number): string {
  const name = DAY_NAMES_FULL[dayOfWeek];
  if (name === undefined) throw new RangeError(`dayOfWeek must be 0–6, got ${dayOfWeek}`);
  return name;
}

/**
 * Returns the short day name for a weekday index (0 = Monday, 6 = Sunday).
 *
 * @example
 *   dayNameShort(0) // "Mon"
 *   dayNameShort(6) // "Sun"
 */
export function dayNameShort(dayOfWeek: number): string {
  const name = DAY_NAMES_SHORT[dayOfWeek];
  if (name === undefined) throw new RangeError(`dayOfWeek must be 0–6, got ${dayOfWeek}`);
  return name;
}

// ---------------------------------------------------------------------------
// Plan item type labels
// ---------------------------------------------------------------------------

/** Map from API plan item type to a display label. */
const ITEM_TYPE_LABELS: Record<string, string> = {
  workout: 'Workout',
  meal: 'Meal',
  habit: 'Habit',
};

/**
 * Returns a human-readable label for a plan item type.
 * Falls back to the raw type string with the first letter capitalised.
 *
 * @example
 *   itemTypeLabel('workout') // "Workout"
 *   itemTypeLabel('meal')    // "Meal"
 */
export function itemTypeLabel(type: string): string {
  return ITEM_TYPE_LABELS[type] ?? (type.charAt(0).toUpperCase() + type.slice(1));
}

// ---------------------------------------------------------------------------
// Progress percentage
// ---------------------------------------------------------------------------

/**
 * Formats a completion_rate (0.0–1.0, or null for unplanned days) as a
 * percentage string.
 *
 * Returns null for null input — callers decide how to render "no plan" days
 * (the brief says show them as empty, not "0%").
 *
 * @example
 *   formatCompletionRate(0.75)  // "75%"
 *   formatCompletionRate(1.0)   // "100%"
 *   formatCompletionRate(null)  // null
 */
export function formatCompletionRate(rate: number | null): string | null {
  if (rate === null) return null;
  // Cap at 100% (server caps at 1.0 but be defensive)
  const pct = Math.min(Math.round(rate * 100), 100);
  return `${pct}%`;
}

// ---------------------------------------------------------------------------
// Streak copy
// ---------------------------------------------------------------------------

/**
 * Returns a short streak label for the UI streak banner.
 * "0" renders as a neutral empty state; a number > 0 adds the flame emoji
 * is NOT added here (icon component handles that).
 *
 * @example
 *   streakLabel(0)  // "No streak yet"
 *   streakLabel(1)  // "1 day"
 *   streakLabel(5)  // "5 days"
 */
export function streakLabel(currentStreak: number): string {
  if (currentStreak === 0) return 'No streak yet';
  return currentStreak === 1 ? '1 day' : `${currentStreak} days`;
}
