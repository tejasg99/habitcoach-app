/**
 * Which root route groups are available in each session phase. Read by the
 * `Stack.Protected` guards in src/app/_layout.tsx.
 *
 * Rule: exactly ONE of starting / auth / onboarding / tabs is open at a time.
 *
 * Why the gallery is tied to `tabs`: when the current screen becomes
 * unavailable, Expo Router does NOT go to the next screen in the JSX order. It
 * sorts the route files (groups first, then shorter names first) and opens the
 * first one that is not guarded. "gallery" is shorter than "starting" and
 * "onboarding", so a gallery that is open in every phase wins that race: on a
 * cold start the user was sent to the gallery and then stayed there. Opening it
 * only together with `(tabs)` (a group, so it always sorts first) removes the
 * race.
 */

import type { AuthEntry, SessionPhase } from './session';

export type RouteGuards = {
  starting: boolean;
  auth: boolean;
  onboarding: boolean;
  tabs: boolean;
  /** The reminder explanation, opened on top of the tabs. Like the gallery, never open without them. */
  reminderPermission: boolean;
  /** Dev-only design gallery, reachable from the Settings tab. */
  gallery: boolean;
};

export function routeGuards(phase: SessionPhase, isDev: boolean): RouteGuards {
  const tabs = phase === 'ready';
  return {
    starting: phase === 'booting' || phase === 'checking' || phase === 'error',
    auth: phase === 'signedOut',
    onboarding: phase === 'onboarding',
    tabs,
    reminderPermission: tabs,
    gallery: isDev && tabs,
  };
}

/**
 * Where the router goes when the current screen's guard closes (the
 * `redirectTo` of every `Stack.Protected` in the root layout): the one screen
 * that is open in the new phase.
 *
 * Why this is needed: without `redirectTo`, Expo Router falls back to the
 * first open route of the root navigator. For the signed-out phase that is the
 * `(auth)` group, whose URL is "/" (groups are not part of URLs). But "/" is
 * the Today tab, not an auth screen, so logout ended on "Unmatched route".
 * An explicit, real URL per phase avoids the guess.
 */
export function phaseHref(phase: SessionPhase, authEntry: AuthEntry = 'welcome'): PhaseHref {
  switch (phase) {
    case 'booting':
    case 'checking':
    case 'error':
      return '/starting';
    case 'signedOut':
      return authEntry === 'login' ? '/login' : '/welcome';
    case 'onboarding':
      return '/onboarding';
    case 'ready':
      return '/';
  }
}

export type PhaseHref = '/starting' | '/login' | '/welcome' | '/onboarding' | '/';
