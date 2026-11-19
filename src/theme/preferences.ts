/**
 * src/theme/preferences.ts
 *
 * Saving and loading the user's theme choice (mode + accent) on the device.
 *
 * AsyncStorage is used ONLY for this (project rule: auth tokens stay in
 * expo-secure-store). The stored value is untrusted input, so it is validated
 * and falls back to defaults instead of crashing on junk.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ACCENT_KEYS,
  DEFAULT_ACCENT,
  DEFAULT_MODE_PREFERENCE,
  type AccentKey,
  type Mode,
  type ModePreference,
} from './tokens';

export type ThemePreferences = {
  mode: ModePreference;
  accent: AccentKey;
};

export const THEME_STORAGE_KEY = 'theme.preferences.v1';

export const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: DEFAULT_MODE_PREFERENCE,
  accent: DEFAULT_ACCENT,
};

const MODES: readonly ModePreference[] = ['system', 'light', 'dark'];

/** Turn the raw stored string into valid preferences, field by field. */
export function parsePreferences(raw: string | null): ThemePreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULT_PREFERENCES;
    const { mode, accent } = data as { mode?: unknown; accent?: unknown };
    return {
      mode: MODES.includes(mode as ModePreference) ? (mode as ModePreference) : DEFAULT_PREFERENCES.mode,
      accent: ACCENT_KEYS.includes(accent as AccentKey) ? (accent as AccentKey) : DEFAULT_PREFERENCES.accent,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Turn the user's preference into a concrete light/dark mode.
 * `systemScheme` is what the phone reports (it can be null/undefined).
 */
export function resolveMode(preference: ModePreference, systemScheme: string | null | undefined): Mode {
  if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return preference;
}

/** Read saved preferences. Never throws: storage trouble means defaults. */
export async function loadPreferences(): Promise<ThemePreferences> {
  try {
    return parsePreferences(await AsyncStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Save preferences. Failing to save must never break the UI, so errors are swallowed. */
export async function savePreferences(preferences: ThemePreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Best effort only: the choice still applies for this session.
  }
}
