/**
 * src/theme/index.ts
 *
 * Public surface of the theme module. Import from '@/theme'.
 */

export { ThemeProvider, useTheme, useThemedStyles, type ThemeContextValue } from './ThemeProvider';
export { useAppFonts } from './fonts';
export {
  ACCENT_KEYS,
  accents,
  buildColors,
  buildTheme,
  MAX_FONT_SCALE_FIXED,
  type AccentKey,
  type ElevationLevel,
  type Mode,
  type ModePreference,
  type TextVariant,
  type Theme,
  type ThemeColors,
} from './tokens';
