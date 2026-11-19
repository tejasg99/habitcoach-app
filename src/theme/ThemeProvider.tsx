/**
 * src/theme/ThemeProvider.tsx
 *
 * Holds the user's theme choice (mode + accent), resolves it to concrete
 * tokens, persists it, and keeps the native chrome (status bar, Android
 * navigation bar, root background) in step with the resolved mode.
 *
 *   <ThemeProvider>            <- once, at the root
 *     const t = useTheme();    <- anywhere below
 *     t.colors.accent, t.spacing[16], t.setAccent('coral') ...
 *
 * `ready` becomes true once the saved choice has been read from storage. The
 * root layout keeps the splash screen up until then, so the first painted
 * frame already uses the right colours (no flash of the wrong theme).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';

import { DEFAULT_PREFERENCES, loadPreferences, resolveMode, savePreferences, type ThemePreferences } from './preferences';
import { buildTheme, type AccentKey, type ModePreference, type Theme } from './tokens';

/** What `useTheme()` returns: the resolved tokens plus the user's choices and setters. */
export type ThemeContextValue = Theme & {
  /** What the user picked: 'system' | 'light' | 'dark'. (`mode` above is the resolved result.) */
  modePreference: ModePreference;
  /** The chosen accent. Same value as `accentKey`, kept as a friendlier name for Settings. */
  accent: AccentKey;
  setModePreference: (mode: ModePreference) => void;
  setAccent: (accent: AccentKey) => void;
  /** True once the saved preferences have been loaded from the device. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ThemePreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  // What the phone says right now. NOTE: while we force light/dark below via
  // Appearance.setColorScheme this reports the forced value, which is fine
  // because we only read it when the preference is 'system' (and in that case
  // we have reset the override to 'auto').
  const systemScheme = useColorScheme();

  // Load the saved choice once at startup.
  useEffect(() => {
    let cancelled = false;
    loadPreferences().then((saved) => {
      if (cancelled) return;
      setPreferences(saved);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = resolveMode(preferences.mode, systemScheme);

  // Build the token object. Only changes when the resolved mode or accent does,
  // so components using it don't re-render needlessly.
  const theme = useMemo(() => buildTheme(resolved, preferences.accent), [resolved, preferences.accent]);

  // Native chrome sync.
  //  - Appearance.setColorScheme tells the OS which scheme the app uses. On
  //    Android that flips the system navigation-bar button colours (dark
  //    buttons on a light bar and vice versa); 'auto' means "follow the phone".
  //  - SystemUI paints the native root view, so overscroll and screen
  //    transitions never reveal a wrong-coloured backdrop.
  useEffect(() => {
    // 'auto' removes any override and follows the phone again.
    Appearance.setColorScheme(preferences.mode === 'system' ? 'auto' : preferences.mode);
  }, [preferences.mode]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {
      // Cosmetic only; ignore failures.
    });
  }, [theme.colors.bg]);

  const setModePreference = useCallback((mode: ModePreference) => {
    setPreferences((prev) => {
      const next = { ...prev, mode };
      void savePreferences(next);
      return next;
    });
  }, []);

  const setAccent = useCallback((accent: AccentKey) => {
    setPreferences((prev) => {
      const next = { ...prev, accent };
      void savePreferences(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...theme,
      modePreference: preferences.mode,
      accent: preferences.accent,
      setModePreference,
      setAccent,
      ready,
    }),
    [theme, preferences.mode, preferences.accent, setModePreference, setAccent, ready],
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* Light icons on a dark background and vice versa. */}
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

/** Read the current theme. Throws if used outside <ThemeProvider> (a setup bug). */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}

type NamedStyles<T> = { [K in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Create a StyleSheet from the current theme:
 *
 *   const styles = useThemedStyles((t) => ({
 *     card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg },
 *   }));
 *
 * The factory re-runs only when the theme changes (mode or accent).
 */
export function useThemedStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  // `theme` (the context value) changes identity when the setters/ready flag
  // change too, so key the memo on the pieces that actually affect styles.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme.mode, theme.accentKey]);
}
