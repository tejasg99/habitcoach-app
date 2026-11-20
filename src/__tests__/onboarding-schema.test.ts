/**
 * Onboarding validation: required choices, enum values from the contract,
 * equipment rules matching the server, and the reminder time format.
 */

import contract from '../../api/openapi.json';
import { DIETARY_PREFS, FITNESS_LEVELS, GOALS } from '@/features/onboarding/labels';
import {
  addEquipmentItem,
  defaultOnboardingValues,
  equipmentItemSchema,
  onboardingSchema,
} from '@/features/onboarding/schema';

const valid = {
  goal: 'build_muscle',
  fitnessLevel: 'beginner',
  dietaryPref: 'vegetarian',
  equipment: ['dumbbells'],
  reminderTime: '07:30:00',
  remindersEnabled: true,
  timezone: 'Asia/Kolkata',
};

/** Paths of the issues zod reports, e.g. ["goal", "equipment.0"]. */
function issuePaths(input: unknown): string[] {
  const result = onboardingSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

describe('enum values', () => {
  it('match the contract exactly (labels.ts cannot drift from api/openapi.json)', () => {
    const schemas = contract.components.schemas;
    expect(GOALS).toEqual(schemas.Goal.enum);
    expect(FITNESS_LEVELS).toEqual(schemas.FitnessLevel.enum);
    expect(DIETARY_PREFS).toEqual(schemas.DietaryPref.enum);
  });
});

describe('onboardingSchema', () => {
  it('accepts a complete profile', () => {
    expect(issuePaths(valid)).toEqual([]);
  });

  it('requires goal, fitness level and dietary preference', () => {
    const paths = issuePaths({ ...defaultOnboardingValues('UTC') });
    expect(paths).toEqual(expect.arrayContaining(['goal', 'fitnessLevel', 'dietaryPref']));
    expect(paths).toHaveLength(3);
  });

  it('gives a plain message for a missing choice', () => {
    const result = onboardingSchema.safeParse({ ...valid, goal: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Choose a goal to continue');
  });

  it('rejects values that are not in the contract', () => {
    expect(issuePaths({ ...valid, goal: 'get_rich' })).toEqual(['goal']);
    expect(issuePaths({ ...valid, fitnessLevel: 'expert' })).toEqual(['fitnessLevel']);
    expect(issuePaths({ ...valid, dietaryPref: 'pescatarian' })).toEqual(['dietaryPref']);
  });

  it('allows an empty equipment list', () => {
    expect(issuePaths({ ...valid, equipment: [] })).toEqual([]);
  });

  it('allows 20 equipment items but not 21', () => {
    const items = (n: number) => Array.from({ length: n }, (_, i) => `item ${i}`);
    expect(issuePaths({ ...valid, equipment: items(20) })).toEqual([]);
    expect(issuePaths({ ...valid, equipment: items(21) })).toEqual(['equipment']);
  });

  it('reports a bad equipment item on its index', () => {
    expect(issuePaths({ ...valid, equipment: ['mat', 'bench!'] })).toEqual(['equipment.1']);
  });

  it('normalises equipment like the server (trim + lowercase)', () => {
    const result = onboardingSchema.parse({ ...valid, equipment: ['  Yoga Mat '] });
    expect(result.equipment).toEqual(['yoga mat']);
  });

  it('requires reminder_time as HH:MM:SS (24-hour)', () => {
    expect(issuePaths({ ...valid, reminderTime: '23:59:00' })).toEqual([]);
    expect(issuePaths({ ...valid, reminderTime: '7:30' })).toEqual(['reminderTime']);
    expect(issuePaths({ ...valid, reminderTime: '24:00:00' })).toEqual(['reminderTime']);
  });

  it('requires a time zone', () => {
    expect(issuePaths({ ...valid, timezone: '  ' })).toEqual(['timezone']);
  });
});

describe('equipmentItemSchema (server rules)', () => {
  it.each(['dumbbells', 'pull-up bar', '2 kettlebells', 'TRX', 'a'.repeat(50)])('accepts %p', (item) => {
    expect(equipmentItemSchema.safeParse(item).success).toBe(true);
  });

  it.each([
    ['', 'Type an item first'],
    ['   ', 'Type an item first'],
    ['a'.repeat(51), 'Use 50 characters or fewer'],
    ['bench!', 'Use letters, numbers, spaces and hyphens only'],
    ['mat/towel', 'Use letters, numbers, spaces and hyphens only'],
    ['haltères', 'Use letters, numbers, spaces and hyphens only'],
    ['bands_light', 'Use letters, numbers, spaces and hyphens only'],
    ['-bands', 'Start with a letter or number'],
  ])('rejects %p', (item, message) => {
    const result = equipmentItemSchema.safeParse(item);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('addEquipmentItem', () => {
  it('adds the normalised item to the end of the list', () => {
    expect(addEquipmentItem(['mat'], '  Kettlebell ')).toEqual({ ok: true, list: ['mat', 'kettlebell'] });
  });

  it('refuses duplicates, case-insensitively', () => {
    expect(addEquipmentItem(['kettlebell'], 'KettleBell')).toEqual({ ok: false, error: 'Already in your list' });
  });

  it('refuses a 21st item', () => {
    const full = Array.from({ length: 20 }, (_, i) => `item ${i}`);
    expect(addEquipmentItem(full, 'rope')).toEqual({ ok: false, error: 'You can add up to 20 items' });
  });

  it('returns the validation message for an invalid item', () => {
    expect(addEquipmentItem([], 'bench!')).toEqual({
      ok: false,
      error: 'Use letters, numbers, spaces and hyphens only',
    });
  });
});
