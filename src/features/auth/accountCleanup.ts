/**
 * src/features/auth/accountCleanup.ts
 *
 * What happens when someone leaves their account, as two functions with
 * injected dependencies so the order and the failure cases can be tested.
 * session.ts passes the real dependencies.
 *
 * Every local step runs even if an earlier one fails: a storage error must
 * not leave the person stuck in the app or leave other data behind.
 */

export type LogoutDeps = {
  /** POST unregister-token if a push token is stored. Needs the auth tokens, so it runs first. */
  unregisterPushToken(signal: AbortSignal): Promise<void>;
  clearTokens(): Promise<void>;
  clearPushToken(): Promise<void>;
  clearCache(): void;
  goToLogin(): void;
};

export type DeleteAccountDeps = Omit<LogoutDeps, 'unregisterPushToken'> & {
  /** DELETE /users/me. Throws ApiError. */
  deleteMe(): Promise<void>;
  clearTimezoneAnswer(): Promise<void>;
};

/**
 * How long logout waits for the push token to be unregistered. Short, because
 * a sleeping server can take 90 s; the server prunes dead tokens itself.
 */
export const UNREGISTER_TIMEOUT_MS = 5000;

/** Run the call but stop waiting (and abort it) after `ms`. Never throws. */
async function tryWithin(call: (signal: AbortSignal) => Promise<void>, ms: number): Promise<void> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve();
    }, ms);
  });
  await Promise.race([call(controller.signal).catch(() => undefined), timeout]);
  clearTimeout(timer);
}

/** Unregister the push token, delete the tokens, clear the cache, go to login. */
export async function runLogout(deps: LogoutDeps): Promise<void> {
  await tryWithin((signal) => deps.unregisterPushToken(signal), UNREGISTER_TIMEOUT_MS);
  await Promise.allSettled([deps.clearTokens(), deps.clearPushToken()]);
  deps.clearCache();
  deps.goToLogin();
}

/**
 * Delete the account on the server, then its data on this device (the theme
 * belongs to the device and stays). If the server call fails, nothing local is
 * touched and the error is rethrown. The push token is only forgotten here: the server deletes its copy with the account.
 */
export async function runDeleteAccount(deps: DeleteAccountDeps): Promise<void> {
  await deps.deleteMe();
  await Promise.allSettled([deps.clearTokens(), deps.clearPushToken(), deps.clearTimezoneAnswer()]);
  deps.clearCache();
  deps.goToLogin();
}
