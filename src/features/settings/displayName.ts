/**
 * src/features/settings/displayName.ts
 *
 * The display name rule, shared with signup (brief: at most 100 characters;
 * blank is allowed and clears the name).
 */

import { signupSchema } from '@/features/auth/forms';

/** The message for a name that cannot be saved, or undefined when it is fine. */
export function displayNameError(input: string): string | undefined {
  const result = signupSchema.shape.displayName.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}
