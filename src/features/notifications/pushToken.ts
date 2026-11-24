/**
 * src/features/notifications/pushToken.ts
 *
 * The logout half of the push token lifecycle. Milestone 8 adds the other
 * half: get the Expo push token, POST /notifications/register-token, then
 * `savePushToken(token)` (src/lib/storage.ts). Once a token is saved there,
 * logout unregisters it with no further changes.
 */

import { apiClient, type ApiClient } from '@/api/client';
import { unwrap } from '@/api/errors';
import { getPushToken } from '@/lib/storage';

/** POST /notifications/unregister-token for the stored token. Does nothing when there is none. */
export async function unregisterStoredPushToken(signal?: AbortSignal, client: ApiClient = apiClient): Promise<void> {
  const token = await getPushToken();
  if (!token) return;
  await unwrap('unregister_push_token', client.POST('/notifications/unregister-token', { body: { token }, signal }));
}
