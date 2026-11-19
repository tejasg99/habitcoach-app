/**
 * src/theme/fonts.ts
 *
 * Loads the four DM Sans weights the type scale uses (400, 500, 600, 700).
 * `useFonts` from @expo-google-fonts wraps expo-font. The keys of this map
 * are the family names listed in `fontFamily` in tokens.ts.
 */

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';

/**
 * Returns true once the fonts are ready OR failed to load. On failure text
 * simply falls back to the system font (the design doc says to fall back),
 * so a font error must never block the app behind the splash screen.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  return loaded || error !== null;
}
