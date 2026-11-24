/**
 * src/features/settings/api.ts
 *
 * The calls Settings makes. Profile changes always go through PATCH with
 * exactly ONE field: a PUT would reset every omitted field to its default and
 * turn reminders back on (brief: "PATCH semantics").
 */

import { apiClient, type ApiClient } from '@/api/client';
import { unwrap } from '@/api/errors';
import type { components } from '@/api/schema';

import type { Me, Profile } from './queries';

type ProfileUpdate = components['schemas']['ProfileUpdate'];
type UserUpdate = components['schemas']['UserUpdate'];

/** The profile fields Settings can change. */
export type ProfileField = 'reminders_enabled' | 'reminder_time' | 'timezone';

/** One changed field and its new value (never null: the API ignores null here). */
export type ProfileChange = { [F in ProfileField]: { field: F; value: Profile[F] } }[ProfileField];

/** The PATCH body: the changed field and nothing else. */
export function toProfilePatch(change: ProfileChange): ProfileUpdate {
  return { [change.field]: change.value };
}

/** The PATCH body for a typed name. Blank clears it, which the API spells `null`. */
export function toDisplayNamePatch(input: string): UserUpdate {
  return { display_name: input.trim() || null };
}

export function patchProfile(change: ProfileChange, client: ApiClient = apiClient): Promise<Profile> {
  return unwrap('update_my_profile', client.PATCH('/onboarding/me', { body: toProfilePatch(change) }));
}

export function patchDisplayName(input: string, client: ApiClient = apiClient): Promise<Me> {
  return unwrap('update_me', client.PATCH('/users/me', { body: toDisplayNamePatch(input) }));
}

/** DELETE /users/me. Clearing the device is done by session.deleteAccount(). */
export async function deleteMe(client: ApiClient = apiClient): Promise<void> {
  await unwrap('delete_me', client.DELETE('/users/me'));
}
