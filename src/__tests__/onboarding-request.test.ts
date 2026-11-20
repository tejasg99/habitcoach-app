/**
 * Onboarding form values -> PUT /onboarding/me body, and 422 field mapping.
 */

import { mapApiError } from '@/api/errors';
import { splitFieldErrors } from '@/features/auth/forms';
import { PROFILE_FIELD_MAP, toProfileRequest } from '@/features/onboarding/request';
import { onboardingSchema, type OnboardingValues } from '@/features/onboarding/schema';
import { deviceTimeZone } from '@/lib/timezone';

const values: OnboardingValues = {
  goal: 'improve_endurance',
  fitnessLevel: 'intermediate',
  dietaryPref: 'eggetarian',
  equipment: ['dumbbells', 'yoga mat'],
  reminderTime: '07:30:00',
  remindersEnabled: false,
  timezone: 'Europe/London',
};

describe('toProfileRequest', () => {
  it('maps every form field to its API name, sending each one explicitly', () => {
    expect(toProfileRequest(values)).toEqual({
      goal: 'improve_endurance',
      fitness_level: 'intermediate',
      dietary_pref: 'eggetarian',
      equipment: ['dumbbells', 'yoga mat'],
      timezone: 'Europe/London',
      reminder_time: '07:30:00',
      reminders_enabled: false,
    });
  });

  it('sends reminders_enabled: false (PUT would otherwise turn reminders back on)', () => {
    expect(toProfileRequest(values)).toHaveProperty('reminders_enabled', false);
  });

  it('never includes a date or a user id', () => {
    const keys = Object.keys(toProfileRequest(values));
    expect(keys.sort()).toEqual(
      ['dietary_pref', 'equipment', 'fitness_level', 'goal', 'reminder_time', 'reminders_enabled', 'timezone'].sort(),
    );
  });

  it('normalises and de-duplicates equipment, keeping the order', () => {
    const body = toProfileRequest({ ...values, equipment: [' Bands', 'mat', 'bands', ''] });
    expect(body.equipment).toEqual(['bands', 'mat']);
  });

  it('works end to end from the schema output', () => {
    const parsed = onboardingSchema.parse({ ...values, equipment: ['  Pull-Up Bar '] });
    expect(toProfileRequest(parsed).equipment).toEqual(['pull-up bar']);
  });
});

describe('PROFILE_FIELD_MAP with a 422', () => {
  it('puts server messages on the matching form fields', () => {
    const error = mapApiError({
      operation: 'save_my_profile',
      status: 422,
      body: {
        detail: [
          { loc: ['body', 'timezone'], msg: "Value error, Must be a valid IANA timezone, e.g. 'Asia/kolkata'", type: 'value_error' },
          { loc: ['body', 'equipment'], msg: 'Value error, Equipment names must be 50 characters or fewer', type: 'value_error' },
          { loc: ['body', 'fitness_level'], msg: 'Input should be a valid option', type: 'enum' },
        ],
      },
    });
    const { fields, formMessage } = splitFieldErrors(error, PROFILE_FIELD_MAP);
    expect(fields).toEqual({
      timezone: "Must be a valid IANA timezone, e.g. 'Asia/kolkata'",
      equipment: 'Equipment names must be 50 characters or fewer',
      fitnessLevel: 'Input should be a valid option',
    });
    expect(formMessage).toBeNull();
  });

  it('keeps an error for an unknown field as a form-level message', () => {
    const error = mapApiError({
      operation: 'save_my_profile',
      status: 422,
      body: { detail: [{ loc: ['body'], msg: 'Field required', type: 'missing' }] },
    });
    expect(splitFieldErrors(error, PROFILE_FIELD_MAP)).toEqual({ fields: {}, formMessage: 'Field required' });
  });
});

describe('deviceTimeZone', () => {
  it('returns the runtime zone', () => {
    expect(deviceTimeZone(() => 'Asia/Kolkata')).toBe('Asia/Kolkata');
  });

  it('falls back to UTC when the runtime has none or throws', () => {
    expect(deviceTimeZone(() => undefined)).toBe('UTC');
    expect(deviceTimeZone(() => ' ')).toBe('UTC');
    expect(
      deviceTimeZone(() => {
        throw new Error('no Intl');
      }),
    ).toBe('UTC');
  });
});
