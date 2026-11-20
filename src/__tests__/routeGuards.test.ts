/**
 * Root route guards: exactly one main group open per session phase, and the
 * dev gallery never open on its own (it used to win Expo Router's fallback
 * sort and swallow the onboarding screen).
 */

import { phaseHref, routeGuards } from '@/features/auth/routeGuards';
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

describe('phaseHref (redirectTo when a guard closes)', () => {
  it.each<[SessionPhase, string]>([
    ['booting', '/starting'],
    ['checking', '/starting'],
    ['error', '/starting'],
    ['onboarding', '/onboarding'],
    ['ready', '/'],
  ])('%s -> %s', (phase, href) => {
    expect(phaseHref(phase)).toBe(href);
  });

  it('logout or an expired session goes to the login screen, never to "/"', () => {
    expect(phaseHref('signedOut', 'login')).toBe('/login');
  });

  it('a fresh launch without tokens goes to the welcome screen', () => {
    expect(phaseHref('signedOut', 'welcome')).toBe('/welcome');
    expect(phaseHref('signedOut')).toBe('/welcome');
  });

  it('every target is a screen that is open in that phase', () => {
    const owner: Record<string, keyof ReturnType<typeof routeGuards>> = {
      '/starting': 'starting',
      '/login': 'auth',
      '/welcome': 'auth',
      '/onboarding': 'onboarding',
      '/': 'tabs',
    };
    for (const phase of PHASES) {
      for (const entry of ['welcome', 'login'] as const) {
        expect(routeGuards(phase, false)[owner[phaseHref(phase, entry)]!]).toBe(true);
      }
    }
  });
});
