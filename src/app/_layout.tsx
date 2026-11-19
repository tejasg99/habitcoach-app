/**
 * src/app/_layout.tsx
 *
 * Root layout. Wraps the app in the ThemeProvider and keeps the native splash
 * screen visible until DM Sans AND the saved theme preference are loaded, so
 * the first frame the user sees already has the right fonts and colours.
 * The auth/startup gate and react-query arrive in Milestone 2.
 */

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ThemeProvider, useAppFonts, useTheme } from '@/theme';

// Imported for its side effect: the env module validates EXPO_PUBLIC_API_URL
// when it loads, so a missing or malformed value fails loudly at startup
// instead of on the first network call.
import '@/lib/env';

// Must run at module load (before the first render) to stop the splash from
// auto-hiding. It is hidden manually below once everything is ready.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}

/** Lives inside ThemeProvider so it can read `ready` from the theme. */
function ThemedStack() {
  const fontsReady = useAppFonts();
  const { ready: themeReady } = useTheme();
  const appReady = fontsReady && themeReady;

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  // Render nothing while loading: the native splash is still covering the screen.
  if (!appReady) return null;

  // No header: each screen will draw its own chrome per the design doc.
  return <Stack screenOptions={{ headerShown: false }} />;
}
