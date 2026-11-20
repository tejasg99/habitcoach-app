/**
 * src/features/onboarding/request.ts
 *
 * Turns the wizard's values into the PUT /onboarding/me body, and maps the
 * API's field names back to form fields for 422 errors.
 *
 * PUT replaces the whole profile (omitted optional fields return to their
 * defaults, including reminders switching back on), so every field is sent
 * explicitly. No dates and no user id are ever part of it.
 */

import type { components } from '@/api/schema';

import { normalizeEquipmentItem, type OnboardingField, type OnboardingValues } from './schema';

export type ProfileRequest = components['schemas']['ProfileIn'];

export function toProfileRequest(values: OnboardingValues): ProfileRequest {
  // Trim, lowercase and de-duplicate like the server does, keeping the user's
  // order (the server sorts; the app displays what comes back).
  const equipment = [...new Set(values.equipment.map(normalizeEquipmentItem))].filter(Boolean);

  return {
    goal: values.goal,
    fitness_level: values.fitnessLevel,
    dietary_pref: values.dietaryPref,
    equipment,
    timezone: values.timezone.trim(),
    reminder_time: values.reminderTime,
    reminders_enabled: values.remindersEnabled,
  };
}

/** API field name (from a 422 `loc`) -> form field, for splitFieldErrors(). */
export const PROFILE_FIELD_MAP: Record<keyof ProfileRequest, OnboardingField> = {
  goal: 'goal',
  fitness_level: 'fitnessLevel',
  dietary_pref: 'dietaryPref',
  equipment: 'equipment',
  timezone: 'timezone',
  reminder_time: 'reminderTime',
  reminders_enabled: 'remindersEnabled',
};
