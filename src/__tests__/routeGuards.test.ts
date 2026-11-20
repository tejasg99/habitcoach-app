/**
 * Root route guards: exactly one main group open per session phase, and the
 * dev gallery never open on its own (it used to win Expo Router's fallback
 * sort and swallow the onboarding screen).
 */

import { routeGuards } from '@/features/auth/routeGuards';
import type { SessionPhase } from '@/features/auth/session';

const PHASES: SessionPhase[] = ['booting', 'checking', 'error', 'signedOut', 'onboarding', 'ready'];

describe('routeGuards', () => {
  it.each(PHASES)('%s opens exactly one main group', (phase) => {
    const { gallery: _gallery, ...main } = routeGuards(phase, true);
    expect(Object.values(main).filter(Boolean)).toHaveLength(1);
  });

  it.each<[SessionPhase, string]>([
    ['booting', 'starting'],
    ['checking', 'starting'],
    ['error', 'starting'],
    ['signedOut', 'auth'],
    ['onboarding', 'onboarding'],
    ['ready', 'tabs'],
  ])('%s -> %s', (phase, open) => {
    expect(routeGuards(phase, false)[open as keyof ReturnType<typeof routeGuards>]).toBe(true);
  });

  it('opens the gallery only next to the tabs, and only in dev', () => {
    for (const phase of PHASES) {
      expect(routeGuards(phase, true).gallery).toBe(phase === 'ready');
      expect(routeGuards(phase, false).gallery).toBe(false);
    }
  });
});
