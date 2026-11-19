/**
 * src/theme/tokens.ts
 *
 * The single place where raw design values live (hex colours, sizes, radii,
 * shadows, type scale). It mirrors the tables in docs/DESIGN.md section by
 * section, so when the design doc changes this is the only file to touch.
 *
 * RULE: this is the ONLY folder allowed to contain hex colours. Components
 * read everything through `useTheme()` / `useThemedStyles()`; an ESLint rule
 * (see eslint.config.js) fails the build if a hex colour appears elsewhere.
 *
 * Nothing in here depends on React or React Native at runtime, which keeps it
 * trivially testable (the WCAG contrast test imports it directly).
 */

// ---------------------------------------------------------------------------
// Basic types
// ---------------------------------------------------------------------------

/** The five user-selectable accents (design doc 3.3). Sage is the default. */
export type AccentKey = 'sage' | 'coral' | 'amber' | 'teal' | 'rose';

/** A resolved colour mode. The user's "system" choice is resolved to one of these. */
export type Mode = 'light' | 'dark';

/** What the user can pick in Settings: follow the phone, or force a mode. */
export type ModePreference = 'system' | Mode;

export const ACCENT_KEYS: readonly AccentKey[] = ['sage', 'coral', 'amber', 'teal', 'rose'];
export const DEFAULT_ACCENT: AccentKey = 'sage';
export const DEFAULT_MODE_PREFERENCE: ModePreference = 'system';

// ---------------------------------------------------------------------------
// Colour tokens
// ---------------------------------------------------------------------------

/** Every colour a component can ask for. Same keys in every mode and accent. */
export type ThemeColors = {
  // Neutrals (design doc 3.1). Slightly warm on purpose.
  bg: string; // screen background
  surface: string; // cards, sheets
  surfaceRaised: string; // floating things: tab bar, menus, toasts
  surfaceMuted: string; // inputs, chips, inset areas, skeletons
  textPrimary: string; // headings, body
  textSecondary: string; // supporting text
  textTertiary: string; // hints, disabled (NOT for body copy, see contrast test)
  scrim: string; // dimmed layer behind modals and sheets

  // Accent family (design doc 3.3). Values change with the chosen accent.
  accent: string; // fills: primary button, progress, completed check
  accentSoft: string; // selected chip background, icon backgrounds
  accentDeep: string; // pressed primary button (light mode), gradient end
  onAccent: string; // text/icons sitting on a solid `accent` fill
  accentText: string; // accent used AS TEXT (links, selected chip label)

  // Hero card (design doc 3.4). Text on the hero is always white.
  heroGradient: [string, string];
  onHero: string; // text/icons on the hero gradient
  onHeroTrack: string; // translucent track for rings/bars on the hero

  // Semantic colours (design doc 3.2). There is deliberately no blue "info".
  success: string;
  successSoft: string;
  successText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
};

/** Neutral colours: the same for every accent, they only change with the mode. */
const neutrals: Record<
  Mode,
  Pick<
    ThemeColors,
    | 'bg'
    | 'surface'
    | 'surfaceRaised'
    | 'surfaceMuted'
    | 'textPrimary'
    | 'textSecondary'
    | 'textTertiary'
    | 'scrim'
    | 'onHero'
    | 'onHeroTrack'
  >
> = {
  light: {
    bg: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F0EDE8',
    textPrimary: '#1C1B19',
    textSecondary: '#6B665F',
    textTertiary: '#8F897F',
    scrim: 'rgba(20,19,17,0.45)',
    onHero: '#FFFFFF',
    onHeroTrack: 'rgba(255,255,255,0.28)',
  },
  dark: {
    bg: '#141311',
    surface: '#1E1C1A',
    surfaceRaised: '#2B2825',
    surfaceMuted: '#272421',
    textPrimary: '#F3F0EB',
    textSecondary: '#B0AAA1',
    textTertiary: '#8A857C',
    scrim: 'rgba(0,0,0,0.6)',
    onHero: '#FFFFFF',
    onHeroTrack: 'rgba(255,255,255,0.28)',
  },
};

/**
 * Semantic colours. The "*Text" variants are darker versions used when the
 * colour is TEXT on its own soft background (e.g. an error message on a
 * pink-ish field). The design doc's base light-mode values only reach about
 * 4.3:1 on their soft backgrounds, so the darker "*Text" shade is how we keep
 * the doc's 4.5:1 rule. In dark mode the base colours already pass, so the
 * text variant equals the base. (Flagged as an addition in the milestone notes.)
 */
const semantic: Record<
  Mode,
  Pick<
    ThemeColors,
    | 'success'
    | 'successSoft'
    | 'successText'
    | 'warning'
    | 'warningSoft'
    | 'warningText'
    | 'danger'
    | 'dangerSoft'
    | 'dangerText'
  >
> = {
  light: {
    success: '#2F7D5B',
    successSoft: '#E3F1EA',
    successText: '#1F5E43',
    warning: '#A65F00',
    warningSoft: '#FBEFD9',
    warningText: '#7F4900',
    danger: '#C23B33',
    dangerSoft: '#FBE5E3',
    dangerText: '#A82E27',
  },
  dark: {
    success: '#6CC49A',
    successSoft: '#1F3329',
    successText: '#6CC49A',
    warning: '#F2B24A',
    warningSoft: '#3A2D17',
    warningText: '#F2B24A',
    danger: '#F0766F',
    dangerSoft: '#3B201E',
    dangerText: '#F0766F',
  },
};

/** The accent-specific part of the palette for one mode. */
type AccentColors = Pick<
  ThemeColors,
  'accent' | 'accentSoft' | 'accentDeep' | 'onAccent' | 'accentText' | 'heroGradient'
>;

/**
 * Accent tables (design doc 3.3 and 3.4), per accent and per mode.
 *
 * `accentText` is the one addition: the design doc's light-mode `accent`
 * reaches only about 4.0 to 4.4:1 on `accentSoft` and `surfaceMuted`, which
 * misses the 4.5:1 text rule. For text we therefore use `accentDeep` in light
 * mode (6:1 or better) and plain `accent` in dark mode (already 5:1 or better).
 * Fills (buttons, progress, checks) keep using `accent` exactly as specified.
 */
export const accents: Record<AccentKey, Record<Mode, AccentColors>> = {
  sage: {
    light: {
      accent: '#2F7D5B',
      accentSoft: '#E3F1EA',
      accentDeep: '#1F5E43',
      onAccent: '#FFFFFF',
      accentText: '#1F5E43',
      heroGradient: ['#2F7D5B', '#1F5E43'],
    },
    dark: {
      accent: '#6CC49A',
      accentSoft: '#1F3329',
      accentDeep: '#1F5E43',
      onAccent: '#0F1F17',
      accentText: '#6CC49A',
      heroGradient: ['#2A6B4E', '#17382B'],
    },
  },
  coral: {
    light: {
      accent: '#C94A2E',
      accentSoft: '#FBE9E3',
      accentDeep: '#A53A22',
      onAccent: '#FFFFFF',
      accentText: '#A53A22',
      heroGradient: ['#C94A2E', '#A53A22'],
    },
    dark: {
      accent: '#F07A5C',
      accentSoft: '#3A2420',
      accentDeep: '#A53A22',
      onAccent: '#2A120B',
      accentText: '#F07A5C',
      heroGradient: ['#B24C33', '#4A2218'],
    },
  },
  amber: {
    light: {
      accent: '#A65F00',
      accentSoft: '#FBEFD9',
      accentDeep: '#7F4900',
      onAccent: '#FFFFFF',
      accentText: '#7F4900',
      heroGradient: ['#A65F00', '#7F4900'],
    },
    dark: {
      accent: '#F2B24A',
      accentSoft: '#3A2D17',
      accentDeep: '#7F4900',
      onAccent: '#2A1A00',
      accentText: '#F2B24A',
      heroGradient: ['#8E5200', '#3F2A0E'],
    },
  },
  teal: {
    light: {
      accent: '#1F7A7A',
      accentSoft: '#DDF0EF',
      accentDeep: '#155C5C',
      onAccent: '#FFFFFF',
      accentText: '#155C5C',
      heroGradient: ['#1F7A7A', '#155C5C'],
    },
    dark: {
      accent: '#55C2BE',
      accentSoft: '#17302F',
      accentDeep: '#155C5C',
      onAccent: '#0A2222',
      accentText: '#55C2BE',
      heroGradient: ['#1E6B6B', '#123A3A'],
    },
  },
  rose: {
    light: {
      accent: '#C2415D',
      accentSoft: '#FBE6EB',
      accentDeep: '#9E3049',
      onAccent: '#FFFFFF',
      accentText: '#9E3049',
      heroGradient: ['#C2415D', '#9E3049'],
    },
    dark: {
      accent: '#F0728B',
      accentSoft: '#3A2028',
      accentDeep: '#9E3049',
      onAccent: '#33101A',
      accentText: '#F0728B',
      heroGradient: ['#AA3A52', '#4A1E2A'],
    },
  },
};

/** Assemble the full colour set for one mode + accent. */
export function buildColors(mode: Mode, accent: AccentKey): ThemeColors {
  return { ...neutrals[mode], ...semantic[mode], ...accents[accent][mode] };
}

// ---------------------------------------------------------------------------
// Spacing, radii, layout constants (design doc 5)
// ---------------------------------------------------------------------------

/** The 4pt spacing scale. Use `theme.spacing[16]`, never a loose number. */
export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
} as const;

/** Corner radii. `pill` is large enough that any height becomes a full pill. */
export const radius = {
  sm: 12, // small inset elements, thumbnails
  md: 16, // inputs, list rows
  lg: 24, // cards
  xl: 32, // hero card, bottom sheets (top corners)
  pill: 999, // buttons, chips, tab bar, toggles
} as const;

/** Named layout rules from the design doc, so screens don't repeat magic numbers. */
export const layout = {
  screenPadding: 20, // horizontal padding of every screen
  sectionGap: 32, // vertical gap between sections
  cardGap: 12, // gap between cards in a list
  cardPadding: 20, // default card inner padding
  cardPaddingCompact: 16, // compact card inner padding
  heroPadding: 24, // hero card inner padding
  minTap: 44, // minimum tap target (extend with hitSlop when the visual is smaller)
  tabBarInset: 20, // floating tab bar distance from the screen sides
  tabBarBottomGap: 12, // floating tab bar distance above the bottom safe area
} as const;

// ---------------------------------------------------------------------------
// Elevation (design doc 5)
// ---------------------------------------------------------------------------

export type ElevationLevel = 'e0' | 'e1' | 'e2' | 'e3';

/** The subset of React Native shadow style props we use. */
export type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android only
};

/** Warm-tinted shadow colour used in light mode (design doc 5). */
const LIGHT_SHADOW_COLOR = '#2B2118';

/**
 * Design doc "blur" values (8, 20, 32) are CSS-style blur diameters. React
 * Native's `shadowRadius` is closer to half of that, so we store blur / 2.
 */
const lightShadows: Record<ElevationLevel, ShadowStyle> = {
  e0: { shadowColor: LIGHT_SHADOW_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  e1: { shadowColor: LIGHT_SHADOW_COLOR, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  e2: { shadowColor: LIGHT_SHADOW_COLOR, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  e3: { shadowColor: LIGHT_SHADOW_COLOR, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
};

/**
 * Dark mode: shadows are invisible on dark backgrounds, so depth comes from
 * the tonal steps bg -> surface -> surfaceRaised instead. Every level is flat
 * (and Android `elevation` is 0 so it doesn't draw a grey smudge).
 */
const darkShadows: Record<ElevationLevel, ShadowStyle> = {
  e0: lightShadows.e0,
  e1: lightShadows.e0,
  e2: lightShadows.e0,
  e3: lightShadows.e0,
};

export const shadows: Record<Mode, Record<ElevationLevel, ShadowStyle>> = {
  light: lightShadows,
  dark: darkShadows,
};

// ---------------------------------------------------------------------------
// Typography (design doc 4)
// ---------------------------------------------------------------------------

/**
 * DM Sans family names as registered by `@expo-google-fonts/dm-sans`.
 * React Native (especially Android) needs one family name per weight, so we
 * pick the family instead of setting `fontWeight`.
 */
export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'caption'
  | 'micro';

export type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  /** Only `micro` is uppercase (design doc 4: "uppercase, +0.4 letter spacing"). */
  uppercase?: boolean;
};

/** The type scale table, row for row: size / line height / weight. */
export const typography: Record<TextVariant, TypeStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 40 },
  title1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
  title2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28 },
  title3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4, uppercase: true },
};

/** Fixed-height elements (tabs, chips, buttons) cap OS font scaling at 130%. */
export const MAX_FONT_SCALE_FIXED = 1.3;

// ---------------------------------------------------------------------------
// Motion (design doc 8)
// ---------------------------------------------------------------------------

export const motion = {
  micro: 150, // press feedback, small state changes (ms)
  transition: 250, // screen / element transitions (ms)
  progress: 600, // ring and bar fills (ms)
} as const;

// ---------------------------------------------------------------------------
// The full theme object
// ---------------------------------------------------------------------------

export type Theme = {
  mode: Mode; // the RESOLVED mode (never 'system')
  accentKey: AccentKey;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  shadows: Record<ElevationLevel, ShadowStyle>;
  type: typeof typography;
  motion: typeof motion;
};

/** Build the complete theme for a resolved mode and an accent. */
export function buildTheme(mode: Mode, accent: AccentKey): Theme {
  return {
    mode,
    accentKey: accent,
    colors: buildColors(mode, accent),
    spacing,
    radius,
    layout,
    shadows: shadows[mode],
    type: typography,
    motion,
  };
}
