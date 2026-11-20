/**
 * src/app/(auth)/_layout.tsx
 *
 * The auth stack: welcome -> login / signup. Only reachable while signed out
 * (guarded in the root layout).
 */

import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

// When the group opens (e.g. after logout), start on the welcome screen.
export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Theme background behind each screen during push/pop animations.
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
