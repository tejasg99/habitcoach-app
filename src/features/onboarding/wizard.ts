/**
 * src/features/onboarding/wizard.ts
 *
 * The wizard's steps and its step state, kept pure so they can be tested
 * without rendering.
 *
 * One react-hook-form instance holds every answer for the whole wizard; the
 * step state only decides which question is on screen. That is why going back
 * never loses what was entered: the values never leave the form.
 */

import type { OnboardingField } from './schema';

export type OnboardingStepId = 'goal' | 'fitness' | 'diet' | 'equipment' | 'reminders';

export type OnboardingStep = {
  id: OnboardingStepId;
  /** The question, shown in the `display` style. */
  title: string;
  /** One supporting line under the question. */
  subtitle: string;
  /** Form fields answered on this step: validated before moving on, and used to find where a 422 belongs. */
  fields: readonly OnboardingField[];
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'goal',
    title: "What's your main goal?",
    subtitle: 'Your weekly plan is built around it',
    fields: ['goal'],
  },
  {
    id: 'fitness',
    title: 'How active are you right now?',
    subtitle: 'So the first week feels doable',
    fields: ['fitnessLevel'],
  },
  {
    id: 'diet',
    title: 'How do you eat?',
    subtitle: 'Meal ideas will match it',
    fields: ['dietaryPref'],
  },
  {
    id: 'equipment',
    title: 'What equipment do you have?',
    subtitle: 'Leave it empty for bodyweight workouts',
    fields: ['equipment'],
  },
  {
    id: 'reminders',
    title: 'Want a daily reminder?',
    subtitle: 'Only on days when nothing is logged yet',
    fields: ['remindersEnabled', 'reminderTime', 'timezone'],
  },
];

export const STEP_COUNT = ONBOARDING_STEPS.length;

export type WizardState = { index: number };

export type WizardAction = { type: 'next' } | { type: 'back' } | { type: 'goTo'; index: number };

export const initialWizardState: WizardState = { index: 0 };

function clamp(index: number): number {
  return Math.min(Math.max(index, 0), STEP_COUNT - 1);
}

/** Moves between steps. Never goes before the first or past the last step. */
export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  const index =
    action.type === 'next' ? state.index + 1 : action.type === 'back' ? state.index - 1 : action.index;
  const next = clamp(index);
  // Same object when nothing changes, so React skips the re-render.
  return next === state.index ? state : { index: next };
}

export function isFirstStep(state: WizardState): boolean {
  return state.index === 0;
}

export function isLastStep(state: WizardState): boolean {
  return state.index === STEP_COUNT - 1;
}

/**
 * The first step that owns any of the given fields, or null. After a 422 the
 * wizard jumps there so the message is visible next to its field.
 */
export function firstStepWithError(fields: readonly OnboardingField[]): number | null {
  const index = ONBOARDING_STEPS.findIndex((step) => step.fields.some((f) => fields.includes(f)));
  return index === -1 ? null : index;
}
