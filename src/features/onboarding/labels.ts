/**
 * src/features/onboarding/labels.ts
 *
 * THE one place for the display labels of the profile enums (goal, fitness
 * level, dietary preference). Onboarding uses them now; Settings will reuse
 * them in Milestone 7.
 *
 * Each map is typed `Record<EnumType, ...>` with the enum types taken from the
 * generated contract (src/api/schema.d.ts). TypeScript then refuses to compile
 * if the backend adds, removes or renames a value and this file is not
 * updated, so the labels can never drift from the contract.
 *
 * The runtime lists of allowed values (for zod and for rendering the choices)
 * are derived from these maps with `enumValues()`, so the values are written
 * exactly once in the app.
 */

import type { components } from '@/api/schema';

export type Goal = components['schemas']['Goal'];
export type FitnessLevel = components['schemas']['FitnessLevel'];
export type DietaryPref = components['schemas']['DietaryPref'];

export type ChoiceLabel = {
  /** Short name, shown as the choice title and in Settings. */
  label: string;
  /** One plain line under the title in the onboarding choice cards. */
  description: string;
};

// Object key order is the order the choices are shown in.

export const GOAL_LABELS: Record<Goal, ChoiceLabel> = {
  lose_weight: { label: 'Lose weight', description: 'Regular movement and lighter meals' },
  build_muscle: { label: 'Build muscle', description: 'Strength work and protein-rich meals' },
  stay_active: { label: 'Stay active', description: 'Move a little every day' },
  improve_endurance: { label: 'Improve endurance', description: 'Build stamina week by week' },
};

export const FITNESS_LEVEL_LABELS: Record<FitnessLevel, ChoiceLabel> = {
  beginner: { label: 'Beginner', description: 'New to exercise, or coming back after a break' },
  intermediate: { label: 'Intermediate', description: 'You work out a few times a week' },
  advanced: { label: 'Advanced', description: 'You train regularly and want a challenge' },
};

export const DIETARY_PREF_LABELS: Record<DietaryPref, ChoiceLabel> = {
  non_vegetarian: { label: 'Non-vegetarian', description: 'Meat, fish, eggs and dairy' },
  eggetarian: { label: 'Eggetarian', description: 'Vegetarian, plus eggs' },
  vegetarian: { label: 'Vegetarian', description: 'No meat, fish or eggs' },
  vegan: { label: 'Vegan', description: 'No animal products' },
};

/**
 * The keys of a label map as a non-empty tuple, the shape `z.enum()` wants.
 * Every map above has at least one key, which the cast relies on.
 */
export function enumValues<T extends string>(labels: Record<T, unknown>): [T, ...T[]] {
  return Object.keys(labels) as [T, ...T[]];
}

export const GOALS = enumValues(GOAL_LABELS);
export const FITNESS_LEVELS = enumValues(FITNESS_LEVEL_LABELS);
export const DIETARY_PREFS = enumValues(DIETARY_PREF_LABELS);

/**
 * Common equipment offered as one-tap suggestions on the equipment step.
 * Already in the server's normalised form (lowercase, letters/numbers/spaces/hyphens).
 */
export const EQUIPMENT_SUGGESTIONS = ['dumbbells', 'resistance bands', 'yoga mat', 'pull-up bar', 'kettlebell'];
