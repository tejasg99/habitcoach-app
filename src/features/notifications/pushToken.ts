/**
 * src/features/notifications/pushToken.ts
 *
 * The unregister call of the push token lifecycle. Registering, and the order
 * of the two at logout, are in registrar.ts and push.ts.
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
