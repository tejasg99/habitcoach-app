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

import type { SessionPhase } from './session';

export type RouteGuards = {
  starting: boolean;
  auth: boolean;
  onboarding: boolean;
  tabs: boolean;
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
    gallery: isDev && tabs,
  };
}
