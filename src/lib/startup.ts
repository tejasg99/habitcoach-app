/**
 * src/lib/startup.ts
 *
 * The startup decision tree (brief: "App flow and navigation"), as a pure
 * async function with injected dependencies so it can be unit tested without
 * a network, SecureStore or React.
 *
 *   1. Fire-and-forget GET /health (warms a sleeping server). Launch only.
 *   2. No stored tokens                      -> auth stack
 *   3. GET /users/me (client refreshes on 401; if that fails too) -> auth stack
 *   4. GET /onboarding/me 404, or profile not complete             -> onboarding
 *   5. GET /plan/today 404                   -> tabs, Today shows "Generate my plan"
 *   6. Background tasks (push token, timezone check), never awaited.
 *
 * Any other failure (offline, timeout, 5xx) on steps 3 and 4 -> 'error', so
 * the gate can offer a retry. The user stays logged in: a network problem is
 * not a reason to throw their tokens away.
 */

import { isApiError, mapApiError, type ApiError, type ApiOperation } from '@/api/errors';

export type StartupDecision =
  | { route: 'auth' }
  | { route: 'onboarding' }
  /** hasPlan: true / false, or null if /plan/today failed for another reason (Today retries itself). */
  | { route: 'tabs'; hasPlan: boolean | null }
  | { route: 'error'; error: ApiError };

export type StartupDeps = {
  /** GET /health. Its result is ignored. */
  warmUp(): Promise<unknown>;
  hasTokens(): Promise<boolean>;
  /** GET /users/me. Throws ApiError. */
  readMe(): Promise<unknown>;
  /** GET /onboarding/me. Throws ApiError (404 = not onboarded). */
  readProfile(): Promise<{ onboarding_complete: boolean }>;
  /** GET /plan/today. Throws ApiError (404 = no active plan). */
  readToday(): Promise<unknown>;
  /** Called once tokens exist and the network checks begin (the gate shows its loading screen). */
  onNetworkCheck?(): void;
  /** Push registration and timezone check (later milestones). Not awaited. */
  runBackgroundTasks?(): void;
};

export type StartupOptions = {
  /** Fire the /health warm-up ping. True at launch, false when re-running after login. */
  warmUp: boolean;
};

function asApiError(operation: ApiOperation, error: unknown): ApiError {
  return isApiError(error) ? error : mapApiError({ operation, cause: error });
}

export async function runStartup(deps: StartupDeps, options: StartupOptions): Promise<StartupDecision> {
  // 1. Warm-up ping. Never awaited, never allowed to fail the startup.
  if (options.warmUp) {
    deps.warmUp().catch(() => undefined);
  }

  // 2. Nothing stored: straight to the auth stack.
  if (!(await deps.hasTokens())) return { route: 'auth' };

  deps.onNetworkCheck?.();

  // 3. Who am I? The client already tried a refresh if the access token expired.
  try {
    await deps.readMe();
  } catch (error) {
    const apiError = asApiError('read_me', error);
    return apiError.kind === 'sessionExpired' ? { route: 'auth' } : { route: 'error', error: apiError };
  }

  // 4. Onboarded?
  try {
    const profile = await deps.readProfile();
    if (!profile.onboarding_complete) {
      deps.runBackgroundTasks?.();
      return { route: 'onboarding' };
    }
  } catch (error) {
    const apiError = asApiError('read_my_profile', error);
    if (apiError.kind === 'sessionExpired') return { route: 'auth' };
    if (apiError.action === 'onboarding') {
      deps.runBackgroundTasks?.();
      return { route: 'onboarding' };
    }
    return { route: 'error', error: apiError };
  }

  // 5. Is there a plan for today?
  let hasPlan: boolean | null;
  try {
    await deps.readToday();
    hasPlan = true;
  } catch (error) {
    const apiError = asApiError('get_today_plan', error);
    if (apiError.kind === 'sessionExpired') return { route: 'auth' };
    hasPlan = apiError.action === 'generatePlan' ? false : null;
  }

  // 6. Background work, not awaited.
  deps.runBackgroundTasks?.();
  return { route: 'tabs', hasPlan };
}
