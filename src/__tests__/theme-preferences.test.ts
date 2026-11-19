/**
 * Tests for the pure theme logic: parsing saved preferences and resolving
 * "system" to a concrete mode. (No React rendering needed.)
 */

import { DEFAULT_PREFERENCES, parsePreferences, resolveMode } from '@/theme/preferences';

describe('parsePreferences', () => {
  it('returns defaults for missing or junk input', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('not json')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('42')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('null')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps valid values', () => {
    expect(parsePreferences(JSON.stringify({ mode: 'dark', accent: 'coral' }))).toEqual({
      mode: 'dark',
      accent: 'coral',
    });
  });

  it('falls back per field when only one is invalid', () => {
    expect(parsePreferences(JSON.stringify({ mode: 'neon', accent: 'rose' }))).toEqual({
      mode: DEFAULT_PREFERENCES.mode,
      accent: 'rose',
    });
    expect(parsePreferences(JSON.stringify({ mode: 'light', accent: 'purple' }))).toEqual({
      mode: 'light',
      accent: DEFAULT_PREFERENCES.accent,
    });
  });

  it('defaults to system mode and the Sage accent', () => {
    expect(DEFAULT_PREFERENCES).toEqual({ mode: 'system', accent: 'sage' });
  });
});

describe('resolveMode', () => {
  it('follows the phone when the preference is system', () => {
    expect(resolveMode('system', 'dark')).toBe('dark');
    expect(resolveMode('system', 'light')).toBe('light');
    expect(resolveMode('system', null)).toBe('light');
    expect(resolveMode('system', undefined)).toBe('light');
  });

  it('ignores the phone when a mode is forced', () => {
    expect(resolveMode('light', 'dark')).toBe('light');
    expect(resolveMode('dark', 'light')).toBe('dark');
  });
});
