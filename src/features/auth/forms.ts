/**
 * src/features/auth/forms.ts
 *
 * Client-side validation for the auth forms (zod, used through
 * react-hook-form) and the helper that puts server 422 messages next to the
 * matching fields.
 *
 * Limits mirror the brief's Conventions: password 8 to 128 characters,
 * display name at most 100. The server is still the authority; these only
 * catch obvious mistakes before a round trip.
 */

import { z } from 'zod';

import type { ApiError } from '@/api/errors';

const email = z
  .string()
  .trim()
  .min(1, { error: 'Enter your email' })
  .pipe(z.email({ error: 'Enter a valid email address' }));

export const loginSchema = z.object({
  email,
  // Login never checks length rules: that would hint at which part is wrong.
  password: z.string().min(1, { error: 'Enter your password' }),
});

export const signupSchema = z.object({
  displayName: z.string().trim().max(100, { error: 'Use 100 characters or fewer' }),
  email,
  password: z
    .string()
    .min(8, { error: 'Use at least 8 characters' })
    .max(128, { error: 'Use 128 characters or fewer' }),
});

export type LoginValues = z.input<typeof loginSchema>;
export type SignupValues = z.input<typeof signupSchema>;

/**
 * Splits a 422's field errors into form fields and a leftover message.
 *
 * `fieldMap` translates API field names to form field names, e.g. login's
 * `username` -> `email`. Errors for unknown fields (or with no field) come
 * back as `formMessage` so they are still shown somewhere.
 */
export function splitFieldErrors<F extends string>(
  error: ApiError,
  fieldMap: Record<string, F>,
): { fields: Partial<Record<F, string>>; formMessage: string | null } {
  const fields: Partial<Record<F, string>> = {};
  let formMessage: string | null = null;
  for (const [apiField, message] of Object.entries(error.fieldErrors)) {
    const formField = fieldMap[apiField];
    if (formField && !fields[formField]) fields[formField] = message;
    else formMessage ??= message;
  }
  // A 422 with no usable detail still needs a visible message.
  if (Object.keys(fields).length === 0 && !formMessage) formMessage = error.message;
  return { fields, formMessage };
}
