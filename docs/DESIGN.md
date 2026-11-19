# AI Habit Coach: Design System

Single source of truth for the UI of the Expo / React Native client (`frontend/`).
If a screen or component contradicts this file, fix the screen or update this file first.

---

## 1. Design principles

1. **Calm, not clinical.** A habit app is opened every day, so it should feel warm and quiet, never noisy.
2. **Space does the separating.** Hierarchy comes from spacing, tone and type weight. There are no outlines or divider lines.
3. **One thing to do first.** Each screen has a single clear primary action or focus (usually today's habits).
4. **The accent is the personality.** Neutrals stay constant. The user's chosen accent carries progress, streaks, and primary actions.
5. **Soft depth.** Subtle shadows in light mode, tonal layering in dark mode.
6. **Celebrate quietly.** Small, satisfying motion and haptics for completions. No confetti spam.

### Hard rules (never break)

| Rule | Detail |
|---|---|
| No hard borders | No `borderWidth` on cards, inputs, chips, buttons or list rows. Separate with tone and spacing and shadows. |
| No purple, no harsh blue | Not in gradients, accents, charts or illustrations. Teal is allowed because it sits clearly on the green side. |
| Gradients are rare | Hero cards only, at most one per screen, two stops from the same hue family. |
| No hardcoded colors | Components read colors from the theme. No hex values in component files. |
| Everything works in light and dark | A component isn't done until it's checked in both modes and with at least two accents. |

---

## 2. Reference and what we take from it

The inspiration is a soft, card-based mobile UI with a warm gradient hero, rounded surfaces and pill chips.

**Borrowed (as ideas, not layouts):**
- A single hero summary card at the top of the home screen
- Large corner radii and generous padding
- Pill-shaped chips for labels and filters
- Circular icon buttons for secondary actions
- Horizontally scrolling card rows
- A compact bottom tab bar
- Soft shadows instead of outlines

**Deliberately different:**
- Habit-specific content and hierarchy (today, plan, progress), not a services grid
- No neumorphic inset or embossed effects, only flat tonal surfaces with one soft shadow
- Accent is user-selectable; there is no fixed orange brand color
- Primary buttons use the accent, not a near-black fill
- No photographic cards; progress visuals (rings, streak flames, calendar heatmap) take that role

---

## 3. Color

All values are tokens. Components use token names, never raw hex.

### 3.1 Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F7F5F2` | `#141311` | Screen background |
| `surface` | `#FFFFFF` | `#1E1C1A` | Cards, sheets |
| `surfaceRaised` | `#FFFFFF` | `#2B2825` | Floating elements (tab bar, menus, toasts) |
| `surfaceMuted` | `#F0EDE8` | `#272421` | Inputs, chips, inset areas, skeletons |
| `textPrimary` | `#1C1B19` | `#F3F0EB` | Headings, body |
| `textSecondary` | `#6B665F` | `#B0AAA1` | Supporting text |
| `textTertiary` | `#8F897F` | `#8A857C` | Hints, placeholders, disabled |
| `scrim` | `rgba(20,19,17,0.45)` | `rgba(0,0,0,0.6)` | Behind modals and sheets |

Neutrals are slightly warm on purpose. Avoid pure `#000` and pure `#FFF` for large areas except the `surface` card color in light mode.

### 3.2 Semantic colors

| Token | Light | Dark | Soft background (light / dark) |
|---|---|---|---|
| `success` | `#2F7D5B` | `#6CC49A` | `#E3F1EA` / `#1F3329` |
| `warning` | `#A65F00` | `#F2B24A` | `#FBEFD9` / `#3A2D17` |
| `danger` | `#C23B33` | `#F0766F` | `#FBE5E3` / `#3B201E` |

There is deliberately no `info` blue. Neutral informational messages use `surfaceMuted` with `textSecondary`.

### 3.3 Accent themes

The user picks one accent in Settings. Default: **Sage**. Each accent defines the same tokens.

| Accent | `accent` (light) | `accent` (dark) | `accentSoft` (light / dark) | `accentDeep` | `onAccent` (light / dark) |
|---|---|---|---|---|---|
| **Sage** (default) | `#2F7D5B` | `#6CC49A` | `#E3F1EA` / `#1F3329` | `#1F5E43` | `#FFFFFF` / `#0F1F17` |
| **Coral** | `#C94A2E` | `#F07A5C` | `#FBE9E3` / `#3A2420` | `#A53A22` | `#FFFFFF` / `#2A120B` |
| **Amber** | `#A65F00` | `#F2B24A` | `#FBEFD9` / `#3A2D17` | `#7F4900` | `#FFFFFF` / `#2A1A00` |
| **Teal** | `#1F7A7A` | `#55C2BE` | `#DDF0EF` / `#17302F` | `#155C5C` | `#FFFFFF` / `#0A2222` |
| **Rose** | `#C2415D` | `#F0728B` | `#FBE6EB` / `#3A2028` | `#9E3049` | `#FFFFFF` / `#33101A` |

How the tokens are used:
- `accent`: primary buttons, active tab, progress fill, completed check, links, selected chip text
- `accentSoft`: selected chip background, icon backgrounds, subtle highlights, heatmap base
- `accentDeep`: gradient end stop and pressed state in light mode
- `onAccent`: text and icons placed on a solid `accent` fill

Contrast: every light-mode `accent` / `onAccent` pair meets 4.5:1. Dark-mode accents are lighter, so they use dark `onAccent` ink.

`accentText` is the accent used **as text** (links, selected chip label, soft and ghost button labels). Light-mode `accent` only reaches about 4.0 to 4.4:1 on `accentSoft` and `surfaceMuted`, so `accentText` = `accentDeep` in light mode and `accent` in dark mode. Fills (buttons, progress, checks) still use `accent`.

### 3.2a Text-on-soft semantic tokens

Added in M1b so text on soft backgrounds meets 4.5:1. Each semantic color also has a `*Soft` background (table above) and a `*Text` color for text on it.

| Token | Light | Dark |
|---|---|---|
| `successText` | `#1F5E43` | `#6CC49A` |
| `warningText` | `#7F4900` | `#F2B24A` |
| `dangerText` | `#A82E27` | `#F0766F` |

Hero helpers: `onHero` = `#FFFFFF` (text on the hero gradient) and `onHeroTrack` = `rgba(255,255,255,0.28)` (ring/bar track on the hero).

### 3.2b Known contrast exception

`textTertiary` is about 3.2:1 on `bg` in light mode, so it is for hints, disabled states and inactive icons only, never body copy. It is tested at 3:1 on `bg`, `surface` and `surfaceRaised`. Input placeholders use `textSecondary` because tertiary on `surfaceMuted` is below 3:1 in light mode.

### 3.4 Hero gradient

One soft gradient is allowed on the top hero card of Today and Progress. It is never used for buttons, text, list rows or backgrounds.

| Accent | Light stops (135°) | Dark stops (135°) |
|---|---|---|
| Sage | `#2F7D5B` → `#1F5E43` | `#2A6B4E` → `#17382B` |
| Coral | `#C94A2E` → `#A53A22` | `#B24C33` → `#4A2218` |
| Amber | `#A65F00` → `#7F4900` | `#8E5200` → `#3F2A0E` |
| Teal | `#1F7A7A` → `#155C5C` | `#1E6B6B` → `#123A3A` |
| Rose | `#C2415D` → `#9E3049` | `#AA3A52` → `#4A1E2A` |

- Text on the hero is always white (`#FFFFFF`) in both modes.
- Optional glow: a radial white overlay at 12 to 18% opacity in the top-left corner for softness. Not implemented: it drops white text below 4.5:1 on lighter accents such as Coral.
- Implementation: `expo-linear-gradient`.

### 3.5 Data visualization

- Charts use the accent in tints only: 100%, 65%, 40%, 20% opacity. No rainbow palettes.
- Streak calendar heatmap: empty = `surfaceMuted`, then accent at 25%, 50%, 75%, 100%.
- Missed or negative days use `surfaceMuted`, not red. Red is for errors, not for guilt.

---

## 4. Typography

**Typeface:** DM Sans (`@expo-google-fonts/dm-sans`), weights 400, 500, 600, 700. Fall back to the system font while it loads.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 34 / 40 | 700 | Hero numbers, onboarding titles |
| `title1` | 28 / 34 | 700 | Screen titles |
| `title2` | 22 / 28 | 600 | Section headers |
| `title3` | 18 / 24 | 600 | Card titles |
| `body` | 16 / 24 | 400 | Default text |
| `bodyStrong` | 16 / 24 | 600 | Emphasis, button labels |
| `callout` | 15 / 22 | 500 | Secondary content |
| `caption` | 13 / 18 | 500 | Metadata, chip labels |
| `micro` | 11 / 14 | 600 | Tab labels, overlines (uppercase, +0.4 letter spacing) |

Rules:
- Streak counts, percentages and times use tabular numbers (`fontVariant: ['tabular-nums']`).
- Sentence case everywhere. Uppercase only for `micro` overlines.
- Maximum two weights per card.
- Support system font scaling. Cap fixed-height elements (tabs, chips) with `maxFontSizeMultiplier={1.3}`.
- Voice: encouraging and plain. Say "3 of 5 done today", not "You are failing at 40%".

---

## 5. Spacing, shape, elevation

### Spacing (4 pt grid)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`

- Screen horizontal padding: **20**
- Gap between sections: **32**
- Gap between cards in a list: **12**
- Card inner padding: **16** (compact) or **20** (default)
- Minimum tap target: **44 × 44**, extended with `hitSlop` where the visual is smaller

### Radii

| Token | Value | Use |
|---|---|---|
| `radiusSm` | 12 | Small inset elements, thumbnails |
| `radiusMd` | 16 | Inputs, list rows |
| `radiusLg` | 24 | Cards |
| `radiusXl` | 32 | Hero card, bottom sheets (top corners) |
| `radiusPill` | 999 | Buttons, chips, tab bar, toggles |

### Elevation

Light mode uses a warm-tinted soft shadow (`shadowColor: #2B2118`). Android uses the closest `elevation`.

| Level | Offset Y | Blur | Opacity | Android elev. | Use |
|---|---|---|---|---|---|
| `e0` | none | none | none | 0 | Flat tonal surfaces |
| `e1` | 2 | 8 | 0.05 | 1 | Cards |
| `e2` | 6 | 20 | 0.08 | 3 | Pressed or lifted cards, menus |
| `e3` | 12 | 32 | 0.12 | 6 | Floating tab bar, sheets, toasts |

**Dark mode:** shadows are effectively invisible on dark backgrounds, so use tonal layering instead (`bg` → `surface` → `surfaceRaised`). Don't add glows or light borders.

---

## 6. Components

### Buttons
All pill-shaped, label in `bodyStrong`, no outlines.

| Variant | Fill | Label | Use |
|---|---|---|---|
| Primary | `accent` | `onAccent` | One per screen at most |
| Secondary | `surfaceMuted` | `textPrimary` | Alternative actions |
| Soft | `accentSoft` | `accent` | Gentle actions (e.g. "Reschedule") |
| Ghost | none | `accent` | Tertiary, inline |
| Destructive | `danger` soft bg | `danger` | Delete, sign out |

Sizes: large 52 (full-width CTA), medium 44, small 36 (never below 36 tall).
States: pressed = scale 0.98 plus fill shifts to `accentDeep` (light) or 90% opacity (dark). Disabled = 40% opacity. Loading = spinner replaces the label, width stays fixed.

### Cards
`surface` fill, `radiusLg`, `e1`, padding 20. No border, no divider lines inside; separate inner groups with 16 to 24 of space or a `surfaceMuted` inset block.

### Hero card
`radiusXl`, hero gradient (§3.4), white text, padding 24. Holds the day's headline ("3 of 5 done"), a progress element, and at most one action. Maximum one per screen.

### Chips
Pill, height 32 to 36, `surfaceMuted` fill with `textSecondary`. Selected: `accentSoft` fill with `accent` text. Used for day selectors, categories and filters.

### Icon buttons
44 × 44 circle, `surfaceMuted` fill (or `surfaceRaised` + `e1` over images and gradients), icon 22.

### Habit row (core component)
- `surface` card row, height at least 64, `radiusMd`
- Left: 28 px circular check. Unchecked = `surfaceMuted` fill. Checked = `accent` fill with a `onAccent` tick
- Middle: habit name (`bodyStrong`) and a `caption` line (time, target)
- Right: optional streak chip (flame icon, tabular number)
- Completion: spring scale 0.9 → 1, fill animates in about 200 ms, light haptic. Completed rows keep full legibility and just lower the title to `textSecondary`. Never strike through.

### Progress
- Ring: 8 px stroke width, `accentSoft` track, `accent` progress, round caps, number in the center
- Bar: 8 px high, `radiusPill`, same colors
- Animated on mount, 600 ms ease-out

### Inputs
Height 52, `radiusMd`, `surfaceMuted` fill, no border. Label above in `caption`. Focus: fill changes to `surface` and a soft accent glow appears (shadow with `accent` at 25%, radius 8). Error: `danger` soft background plus a message under the field in `caption` and `danger`. Never rely on color alone, so include the message text and an icon.

### Bottom tab bar
Floating pill, `surfaceRaised`, `e3`, 12 from the bottom safe area, inset 20 from the sides. Tabs: **Today · Plan · Progress · Settings**. Active tab shows the icon in `accent` with an `accentSoft` pill behind it and a `micro` label. Inactive uses `textTertiary`. Use a light haptic on switch.

### Sheets and dialogs
Bottom sheets: `surface`, top radius `radiusXl`, grabber 36 × 4 in `surfaceMuted`, `scrim` behind. Prefer sheets over centered dialogs.

### Toasts
`surfaceRaised`, `radiusPill`, `e3`, appears 16 above the tab bar. Auto-dismiss in 3 s (5 s for errors with an action).

### Empty, loading, error states
- Empty: simple icon in an `accentSoft` circle, a `title3` line, one `callout` line, one CTA
- Loading: `surfaceMuted` skeleton blocks with a gentle pulse (no spinners for full screens)
- Error: `danger` soft card with a retry action, written in plain language

### Icons
Lucide (`lucide-react-native`), rounded style, stroke 1.75, size 24 (20 in chips, 22 in icon buttons). Use one icon family only.

---

## 7. Screen guidance

High level only; the detailed plan is separate.

| Screen | Layout notes |
|---|---|
| **Auth** | Soft `bg`, large `title1`, filled inputs, one primary button. No gradient. |
| **Onboarding** | One question per screen, `display` heading, chip or card choices, progress dots in `accent`. |
| **Today** | Hero card (progress and encouragement) → habit rows grouped by time of day → quiet "tomorrow" preview. |
| **Plan (weekly)** | Day chip selector at the top → that day's habits as rows. Plan details open in a sheet. |
| **Progress** | Hero card with streak and completion rate → weekly chart → streak calendar heatmap. |
| **Settings** | Grouped `surface` cards. Appearance (mode, accent), reminders (time, timezone), account. |

The appearance section shows live previews: five accent swatches (circles) and a Light / Dark / System segmented control.

---

## 8. Motion and haptics

- Durations: micro-interactions 150 ms, transitions 250 ms, progress fills 600 ms
- Easing: ease-out for entering, ease-in for exiting, spring for completions
- Use Reanimated for anything running during gestures; avoid layout-thrashing animations
- Haptics (`expo-haptics`): light on habit completion and tab change, success on finishing all of today's habits
- Respect the OS "reduce motion" setting: replace movement with simple fades

---

## 9. Accessibility

- Text contrast at least 4.5:1, large text and UI components at least 3:1, in both modes and all accents
- Information is never conveyed by color alone (completed rows also show a tick, errors also show text)
- All interactive elements have `accessibilityRole` and `accessibilityLabel`
- Progress rings expose their value (e.g. "3 of 5 habits completed")
- Layouts must survive 130% font scaling without clipping
- Don't depend on gestures alone; every swipe action has a visible alternative

---

## 10. Theming implementation

- Theme state: `mode` (`system | light | dark`) and `accent` (`sage | coral | amber | teal | rose`), persisted locally and applied before first paint to avoid a flash.
- A `ThemeProvider` exposes `useTheme()` returning resolved tokens (colors, type, spacing, radii, shadows). Components never import raw color constants.
- Styles are created from the theme, for example `const styles = useThemedStyles((t) => ({ ... }))`.
- Set `StatusBar` style and the Android navigation bar to match the resolved mode.
- Keep tokens in a single `src/theme/` module that mirrors the tables in this file.

```ts
// src/theme/tokens.ts (shape only)
export type AccentKey = 'sage' | 'coral' | 'amber' | 'teal' | 'rose';
export type Mode = 'light' | 'dark';

export type Theme = {
  mode: Mode;
  colors: {
    bg: string; surface: string; surfaceRaised: string; surfaceMuted: string;
    textPrimary: string; textSecondary: string; textTertiary: string; scrim: string;
    accent: string; accentSoft: string; accentDeep: string; onAccent: string;
    heroGradient: [string, string];
    success: string; warning: string; danger: string;
  };
  spacing: Record<4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48, number>;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
};
```

---

## 11. Review checklist (before merging any UI work)

- [ ] No `borderWidth` anywhere in the diff
- [ ] No raw hex values in component files
- [ ] Checked in light and dark, with Sage and one other accent
- [ ] No purple or blue gradients, and at most one gradient on the screen
- [ ] Tap targets at least 44 px, labels present for screen readers
- [ ] Spacing uses the scale in §5
- [ ] Works at 130% font size

---

## 12. Changelog

| Date | Change |
|---|---|
| 2026-11-17 | Initial version |
| 2026-11-19 | M1b: added `accentText`, `*Text` semantic tokens, `onHero` / `onHeroTrack`, the `textTertiary` exception, and noted the hero glow is not implemented |
