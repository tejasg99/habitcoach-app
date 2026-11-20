/**
 * src/app/_layout.tsx
 *
 * Root layout.
 *
 *  - ThemeProvider around everything; the native splash stays up until DM
 *    Sans, the saved theme AND the stored-token check are ready, so the first
 *    painted frame is already the right screen in the right colours.
 *  - Starts the session gate once (src/features/auth/session.ts), which also
 *    fires the /health warm-up ping.
 *  - Guarded navigation: each session phase makes exactly ONE route group
 *    available through `Stack.Protected` (src/features/auth/routeGuards.ts).
 *    When the phase changes, Expo Router moves to the one open screen, so a
 *    signed-in user can never land on an auth screen and a signed-out user
 *    can never land on the tabs.
 *  - The "Waking up the server..." toast floats above every screen.
 */

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { WakingToast } from '@/components/layout/WakingToast';
import { phaseHref, routeGuards } from '@/features/auth/routeGuards';
import { launchSession, useSession } from '@/features/auth/session';
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
      <RootNavigator />
    </ThemeProvider>
  );
}

/** Lives inside ThemeProvider so it can read `ready` and the colours from the theme. */
function RootNavigator() {
  const fontsReady = useAppFonts();
  const { ready: themeReady, colors } = useTheme();
  const { phase, authEntry } = useSession();

  // Run the startup gate once at launch.
  useEffect(() => {
    launchSession();
  }, []);

  const uiReady = fontsReady && themeReady;
  // 'booting' = still reading SecureStore (a few ms); keep the splash up so
  // the user never sees a flash of the startup screen before the auth stack.
  const splashCanHide = uiReady && phase !== 'booting';

  useEffect(() => {
    if (splashCanHide) {
      void SplashScreen.hideAsync();
    }
  }, [splashCanHide]);

  // Render nothing while fonts/theme load: the native splash covers the screen.
  if (!uiReady) return null;

  // One route group open per phase; see routeGuards.ts for why the gallery
  // is tied to the tabs.
  const guards = routeGuards(phase, __DEV__);
  // Where a closed guard sends the user: the open screen of the current phase
  // (e.g. logout -> /login). Without it Expo Router guessed "/" for the auth
  // group and showed "Unmatched route"; see phaseHref() in routeGuards.ts.
  const redirectTo = phaseHref(phase, authEntry);

  return (
    <>
      <Stack
        screenOptions={{
          // No header: each screen draws its own chrome per the design doc.
          headerShown: false,
          // Paint the theme background behind every screen, so no white
          // frame flashes during transitions in dark mode.
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* When the current screen becomes unavailable, the router opens
            the first unguarded route by ITS OWN sort order (groups first,
            then shorter names), not by the order below. That is why only
            one of these is ever open at a time. */}
        <Stack.Protected guard={guards.starting} redirectTo={redirectTo}>
          <Stack.Screen name="starting" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={guards.auth} redirectTo={redirectTo}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={guards.onboarding} redirectTo={redirectTo}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={guards.tabs} redirectTo={redirectTo}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        </Stack.Protected>
        {/* Design gallery: development builds only, and only next to the tabs. */}
        <Stack.Protected guard={guards.gallery} redirectTo={redirectTo}>
          <Stack.Screen name="gallery" />
        </Stack.Protected>
      </Stack>
      <WakingToast />
    </>
  );
}
