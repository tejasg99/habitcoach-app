/**
 * src/features/settings/mutations.ts
 *
 * Saving one Settings field, as TanStack mutation options (so tests can run
 * them without rendering) plus the hooks the screens use.
 *
 * Reminder changes are optimistic: the switch moves at once, and goes back if
 * the save fails. The time zone is not, because its sheet waits for the answer.
 * Only the changed field is written to the cache, so two saves in flight never
 * overwrite each other's value.
 */

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/api/errors';
import { sessionNeedsOnboarding } from '@/features/auth/session';
import { planKeys } from '@/features/plan/queries';
import { progressKeys } from '@/features/progress/queries';

import { patchDisplayName, patchProfile, type ProfileChange } from './api';
import { settingsKeys, type Me, type Profile } from './queries';

type ProfileContext = { previous: Profile | undefined };

/**
 * Write one field into the cached profile. Does nothing when there is no
 * cached profile: a save that finishes after logout must not put the old
 * account's data back.
 */
function writeField(client: QueryClient, field: ProfileChange['field'], value: ProfileChange['value']): void {
  client.setQueryData<Profile>(settingsKeys.profile, (old) => (old ? { ...old, [field]: value } : undefined));
}

export function profileMutationOptions(
  client: QueryClient,
  save: (change: ProfileChange) => Promise<Profile> = (change) => patchProfile(change),
  onNeedsOnboarding: () => void = sessionNeedsOnboarding,
) {
  return {
    // Saves run one after another, in the order they were made.
    scope: { id: 'profile' },
    mutationFn: save,
    onMutate: async (change: ProfileChange): Promise<ProfileContext> => {
      // A read already on its way could bring back the old value.
      await client.cancelQueries({ queryKey: settingsKeys.profile });
      const previous = client.getQueryData<Profile>(settingsKeys.profile);
      if (change.field !== 'timezone') writeField(client, change.field, change.value);
      return { previous };
    },
    onSuccess: async (saved: Profile, change: ProfileChange) => {
      // Same for a read that started while the save was running.
      await client.cancelQueries({ queryKey: settingsKeys.profile });
      // Show what the server stored.
      writeField(client, change.field, saved[change.field]);
      if (change.field === 'timezone') {
        // "Today" may be another day now: reload everything that depends on it.
        // Not awaited: the save itself is done, and a reload can be slow.
        void client.invalidateQueries({ queryKey: planKeys.all });
        void client.invalidateQueries({ queryKey: progressKeys.all });
      }
    },
    onError: (error: Error, change: ProfileChange, context: ProfileContext | undefined) => {
      if (context?.previous) writeField(client, change.field, context.previous[change.field]);
      // 404: there is no profile any more.
      if (isApiError(error) && error.action === 'onboarding') onNeedsOnboarding();
    },
  };
}

export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation(profileMutationOptions(client));
}

export function useSaveDisplayName() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: string) => patchDisplayName(input),
    onSuccess: async (saved) => {
      await client.cancelQueries({ queryKey: settingsKeys.me });
      client.setQueryData<Me>(settingsKeys.me, (old) => (old ? saved : undefined));
    },
  });
}

/**
 * The message to show for a failed save: the server's own words for a 422 on
 * that field, otherwise the shared copy. Nothing when the session ended (the
 * login screen is already opening).
 */
export function saveErrorMessage(error: Error | null, field: string): string | undefined {
  if (!error) return undefined;
  if (!isApiError(error)) return 'Something went wrong. Try again.';
  if (error.kind === 'sessionExpired') return undefined;
  return error.fieldErrors[field] ?? error.message;
}
