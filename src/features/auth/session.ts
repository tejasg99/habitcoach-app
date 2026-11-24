/**
 * src/features/auth/session.ts
 *
 * The app-wide session state that drives guarded navigation. One small store
 * (no React context needed), read with `useSession()`.
 *
 * Phases:
 *   booting     reading SecureStore at launch (the native splash is still up)
 *   checking    tokens exist; /users/me etc. in flight (the "starting" screen)
 *   error       a startup call failed for a non-auth reason (retry offered)
 *   signedOut   auth stack (welcome, login, signup)
 *   onboarding  onboarding flow
 *   ready       main tabs
 *
 * The root layout maps each phase to exactly one available route group with
 * `Stack.Protected`, so signed-in users never see auth screens and vice versa.
 */

import { useSyncExternalStore } from 'react';

import { apiClient } from '@/api/client';
import { type ApiError } from '@/api/errors';
import { onSessionExpired } from '@/api/events';
import { unregisterStoredPushToken } from '@/features/notifications/pushToken';
import { fetchTodayPlan, planKeys } from '@/features/plan/queries';
import { deleteMe } from '@/features/settings/api';
import { fetchMe, fetchProfile, settingsKeys } from '@/features/settings/queries';
import { queryClient } from '@/lib/queryClient';
import { continueToTabs, runStartup, type StartupDeps } from '@/lib/startup';
import { clearPushToken, clearTimezoneAnswer, clearTokens, hasStoredTokens } from '@/lib/storage';

import { runDeleteAccount, runLogout, type LogoutDeps } from './accountCleanup';

export type SessionPhase = 'booting' | 'checking' | 'error' | 'signedOut' | 'onboarding' | 'ready';

export type SessionState = {
  phase: SessionPhase;
  /** From the gate's /plan/today check. null = unknown (Today will load it). */
  hasPlan: boolean | null;
  /** Set in the 'error' phase. */
  error: ApiError | null;
  /**
   * 'signedOut' only: which auth screen to open. 'welcome' on a fresh launch
   * without tokens; 'login' after logout or an expired session (the person
   * already has an account). Default: 'welcome'.
   */
  authEntry?: AuthEntry;
};

export type AuthEntry = 'welcome' | 'login';

let state: SessionState = { phase: 'booting', hasPlan: null, error: null };
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Listen for phase changes outside React (e.g. the plan generator resets on sign out). */
export const subscribeSession = subscribe;

export function getSession(): SessionState {
  return state;
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, getSession);
}

// The real dependencies of the startup decision tree.
const startupDeps: StartupDeps = {
  warmUp: () => apiClient.GET('/health'),
  hasTokens: hasStoredTokens,
  // All three reads go through the query cache, so Settings, the time zone
  // check, Today and Plan reuse these answers right after the gate.
  readMe: () => queryClient.fetchQuery({ queryKey: settingsKeys.me, queryFn: fetchMe, staleTime: 0 }),
  readProfile: () => queryClient.fetchQuery({ queryKey: settingsKeys.profile, queryFn: fetchProfile, staleTime: 0 }),
  readToday: () => queryClient.fetchQuery({ queryKey: planKeys.today, queryFn: fetchTodayPlan, staleTime: 0 }),
  onNetworkCheck: () => setState({ phase: 'checking', hasPlan: null, error: null }),
  runBackgroundTasks: () => {
    // Push token registration (Milestone 8) starts from here. The time zone
    // check lives in TimezonePromptHost: it needs a sheet, and also runs each
    // time the app returns to the foreground.
  },
};

// Each run gets a number; a slower, older run can't overwrite a newer result.
let runId = 0;
let launched = false;

async function runGate(warmUp: boolean): Promise<void> {
  const id = ++runId;
  const decision = await runStartup(startupDeps, { warmUp });
  if (id !== runId) return;

  switch (decision.route) {
    case 'auth':
      setState({ phase: 'signedOut', hasPlan: null, error: null, authEntry: warmUp ? 'welcome' : 'login' });
      break;
    case 'onboarding':
      setState({ phase: 'onboarding', hasPlan: null, error: null });
      break;
    case 'tabs':
      setState({ phase: 'ready', hasPlan: decision.hasPlan, error: null });
      break;
    case 'error':
      setState({ phase: 'error', hasPlan: null, error: decision.error });
      break;
  }
}

/** Run the gate once at launch (with the /health warm-up). Safe to call twice. */
export function launchSession(): void {
  if (launched) return;
  launched = true;
  void runGate(true);
}

/** After a successful login: run the gate again (no warm-up needed). */
export function sessionSignedIn(): Promise<void> {
  setState({ phase: 'checking', hasPlan: null, error: null });
  return runGate(false);
}

/**
 * Onboarding was just saved (PUT /onboarding/me succeeded): continue the gate
 * from the plan check instead of starting over. The user stays on the
 * onboarding screen (its button shows a spinner) until this resolves, then the
 * phase flips to 'ready' and the router opens the tabs.
 */
export async function onboardingCompleted(): Promise<void> {
  const id = ++runId;
  // Anything cached before the save (an incomplete profile) is now wrong.
  queryClient.removeQueries({ queryKey: settingsKeys.profile });
  const decision = await continueToTabs(startupDeps);
  if (id !== runId) return;
  setState(
    decision.route === 'tabs'
      ? { phase: 'ready', hasPlan: decision.hasPlan, error: null }
      : { phase: 'signedOut', hasPlan: null, error: null, authEntry: 'login' },
  );
}

/**
 * POST /plan/generate answered 409 "complete onboarding first": the profile is
 * missing or incomplete on the server, so open the onboarding flow.
 */
export function sessionNeedsOnboarding(): void {
  runId += 1;
  setState({ phase: 'onboarding', hasPlan: null, error: null });
}

/** A plan was generated: keep the gate's `hasPlan` flag in step with the cache. */
export function planBecameAvailable(): void {
  if (state.phase === 'ready' && state.hasPlan !== true) setState({ ...state, hasPlan: true });
}

/** Retry from the gate's error screen. */
export function retrySession(): Promise<void> {
  setState({ phase: 'checking', hasPlan: null, error: null });
  return runGate(false);
}

// What leaving the account touches. The order is in accountCleanup.ts.
const logoutDeps: LogoutDeps = {
  unregisterPushToken: (signal) => unregisterStoredPushToken(signal),
  clearTokens,
  clearPushToken,
  clearCache: () => queryClient.clear(), // the next account must never see this one's cached data
  goToLogin: () => {
    runId += 1; // cancel any gate run still in flight
    setState({ phase: 'signedOut', hasPlan: null, error: null, authEntry: 'login' });
  },
};

// One logout at a time: a second tap while it runs joins the first.
let signOutInFlight: Promise<void> | null = null;

/**
 * Client-side logout: unregister the push token (if this device has one),
 * delete the stored tokens, clear the cache and go to the login screen.
 */
export function signOut(): Promise<void> {
  runId += 1; // a gate run still in flight must not reopen the app
  signOutInFlight ??= runLogout(logoutDeps).finally(() => {
    signOutInFlight = null;
  });
  return signOutInFlight;
}

/**
 * DELETE /users/me, then clear the account's data on the device (the theme
 * choice stays) and go to the login screen. Throws ApiError (and changes nothing) if the call fails.
 */
export function deleteAccount(): Promise<void> {
  return runDeleteAccount({
    ...logoutDeps,
    deleteMe: () => deleteMe(),
    clearTimezoneAnswer,
  });
}

// The API client gave up on refreshing: tokens are already cleared.
onSessionExpired(() => {
  runId += 1;
  queryClient.clear();
  setState({ phase: 'signedOut', hasPlan: null, error: null, authEntry: 'login' });
});
