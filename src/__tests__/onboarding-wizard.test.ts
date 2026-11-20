/**
 * Onboarding wizard step state.
 */

import {
  firstStepWithError,
  initialWizardState,
  isFirstStep,
  isLastStep,
  ONBOARDING_STEPS,
  STEP_COUNT,
  wizardReducer,
  type WizardAction,
  type WizardState,
} from '@/features/onboarding/wizard';

const run = (actions: WizardAction[], from: WizardState = initialWizardState) =>
  actions.reduce(wizardReducer, from);

describe('steps', () => {
  it('asks goal, fitness, diet, equipment, then reminders', () => {
    expect(ONBOARDING_STEPS.map((s) => s.id)).toEqual(['goal', 'fitness', 'diet', 'equipment', 'reminders']);
  });

  it('every form field belongs to exactly one step', () => {
    const fields = ONBOARDING_STEPS.flatMap((s) => s.fields);
    expect(new Set(fields).size).toBe(fields.length);
    expect([...fields].sort()).toEqual(
      ['dietaryPref', 'equipment', 'fitnessLevel', 'goal', 'reminderTime', 'remindersEnabled', 'timezone'].sort(),
    );
  });
});

describe('wizardReducer', () => {
  it('starts on the first step', () => {
    expect(initialWizardState.index).toBe(0);
    expect(isFirstStep(initialWizardState)).toBe(true);
    expect(isLastStep(initialWizardState)).toBe(false);
  });

  it('moves forward and back one step at a time', () => {
    expect(run([{ type: 'next' }, { type: 'next' }]).index).toBe(2);
    expect(run([{ type: 'next' }, { type: 'next' }, { type: 'back' }]).index).toBe(1);
  });

  it('never goes before the first step', () => {
    const state = run([{ type: 'back' }]);
    expect(state).toBe(initialWizardState); // unchanged object: no re-render
  });

  it('never goes past the last step', () => {
    const state = run(Array.from({ length: STEP_COUNT + 3 }, () => ({ type: 'next' }) as const));
    expect(state.index).toBe(STEP_COUNT - 1);
    expect(isLastStep(state)).toBe(true);
  });

  it('goTo jumps to a step, clamped to the valid range', () => {
    expect(run([{ type: 'goTo', index: 3 }]).index).toBe(3);
    expect(run([{ type: 'goTo', index: 99 }]).index).toBe(STEP_COUNT - 1);
    expect(run([{ type: 'goTo', index: -2 }]).index).toBe(0);
  });
});

describe('firstStepWithError', () => {
  it('finds the earliest step that owns one of the fields', () => {
    expect(firstStepWithError(['timezone', 'equipment'])).toBe(3);
    expect(firstStepWithError(['reminderTime'])).toBe(4);
    expect(firstStepWithError(['dietaryPref', 'goal'])).toBe(0);
  });

  it('returns null when no step owns the fields', () => {
    expect(firstStepWithError([])).toBeNull();
  });
});
