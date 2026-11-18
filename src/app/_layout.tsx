/**
 * src/app/_layout.tsx
 *
 * Root layout. Milestone 1: a bare Stack that renders the blank index screen.
 * Providers (theme, react-query) and the auth/startup gate arrive in later
 * milestones.
 */

import { Stack } from 'expo-router';

// Imported for its side effect: the env module validates EXPO_PUBLIC_API_URL
// when it loads, so a missing or malformed value fails loudly at startup
// instead of on the first network call.
import '@/lib/env';

export default function RootLayout() {
  // No header: each screen will draw its own chrome per the design doc.
  return <Stack screenOptions={{ headerShown: false }} />;
}
