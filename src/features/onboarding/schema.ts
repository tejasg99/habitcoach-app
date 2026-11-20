/**
 * src/features/onboarding/schema.ts
 *
 * Client-side validation for the onboarding wizard (zod, used through
 * react-hook-form). It mirrors what the server checks for PUT /onboarding/me:
 *
 *  - goal, fitness_level, dietary_pref: required, one of the contract's enum
 *    values (the lists come from ./labels.ts, which is typed against the
 *    generated contract).
 *  - equipment: at most 20 items. The server trims and lowercases each item,
 *    then requires 1 to 50 characters matching [a-z0-9][a-z0-9 -]* (letters,
 *    numbers, spaces and hyphens, starting with a letter or number). The
 *    contract only documents maxItems, so the item rules were read from the
 *    backend (app/schemas/profile.py) and recorded in docs/BACKEND_REQUESTS.md.
 *  - reminder_time: "HH:MM:SS" local wall-clock time.
 *  - timezone: an IANA name (the server checks it is a real zone; the device
 *    supplies it, so the client only checks it is not empty).
 *
 * The server stays the authority: its 422 messages are shown next to the
 * matching fields too.
 */

import { z } from 'zod';

import { DIETARY_PREFS, FITNESS_LEVELS, GOALS } from './labels';

export const EQUIPMENT_MAX_ITEMS = 20;
export const EQUIPMENT_MAX_LENGTH = 50;

/** What the server stores for an equipment item: trimmed and lowercased. */
export function normalizeEquipmentItem(raw: string): string {
  return raw.trim().toLowerCase();
}

/** One equipment item. Input: what the user typed. Output: the normalised name. */
export const equipmentItemSchema = z
  .string()
  .transform(normalizeEquipmentItem)
  .pipe(
    z
      .string()
      .min(1, { error: 'Type an item first' })
      .max(EQUIPMENT_MAX_LENGTH, { error: `Use ${EQUIPMENT_MAX_LENGTH} characters or fewer` })
      .regex(/^[a-z0-9 -]+$/, { error: 'Use letters, numbers, spaces and hyphens only' })
      .regex(/^[a-z0-9]/, { error: 'Start with a letter or number' }),
  );

/** "HH:MM:SS", 24-hour clock. */
const REMINDER_TIME = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const onboardingSchema = z.object({
  goal: z.enum(GOALS, { error: 'Choose a goal to continue' }),
  fitnessLevel: z.enum(FITNESS_LEVELS, { error: 'Choose the level that fits you best' }),
  dietaryPref: z.enum(DIETARY_PREFS, { error: 'Choose how you eat to continue' }),
  equipment: z
    .array(equipmentItemSchema)
    .max(EQUIPMENT_MAX_ITEMS, { error: `Add up to ${EQUIPMENT_MAX_ITEMS} items` }),
  reminderTime: z.string().regex(REMINDER_TIME, { error: 'Pick a reminder time' }),
  remindersEnabled: z.boolean(),
  timezone: z.string().trim().min(1, { error: 'Time zone is missing' }),
});

/** What the form holds while the user fills it in (enum fields may still be empty). */
export type OnboardingInput = z.input<typeof onboardingSchema>;
/** What a valid form produces (enums set, equipment normalised). */
export type OnboardingValues = z.output<typeof onboardingSchema>;
export type OnboardingField = keyof OnboardingInput;

/**
 * Starting values. Optional fields use the server's own defaults
 * (reminders on at 20:00), and the time zone comes from the device.
 * The three choices start empty: react-hook-form accepts partial defaults.
 */
export function defaultOnboardingValues(timezone: string): Partial<OnboardingInput> {
  return {
    equipment: [],
    reminderTime: '20:00:00',
    remindersEnabled: true,
    timezone,
  };
}

export type AddEquipmentResult = { ok: true; list: string[] } | { ok: false; error: string };

/**
 * Adds one typed item to the equipment list, applying the same rules as the
 * server plus two of the client's own: no duplicates (the server would merge
 * them silently) and the 20-item cap checked before adding.
 */
export function addEquipmentItem(list: readonly string[], raw: string): AddEquipmentResult {
  const parsed = equipmentItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check this item' };
  }
  const item = parsed.data;
  if (list.includes(item)) return { ok: false, error: 'Already in your list' };
  if (list.length >= EQUIPMENT_MAX_ITEMS) {
    return { ok: false, error: `You can add up to ${EQUIPMENT_MAX_ITEMS} items` };
  }
  return { ok: true, list: [...list, item] };
}
