/**
 * src/theme/contrast.ts
 *
 * WCAG 2.x contrast maths, written as plain functions so the unit test (and
 * any future tooling) can check colour pairs without rendering anything.
 *
 * Formula (from the WCAG spec): convert each sRGB channel to linear light,
 * combine into "relative luminance" L, then ratio = (L_light + 0.05) / (L_dark + 0.05).
 * Ratios run from 1 (identical) to 21 (black on white).
 */

/** Parse "#RRGGBB" (or "#RGB") into 0-255 channels. Throws on anything else. */
export function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`parseHex: unsupported colour "${hex}" (expected #RGB or #RRGGBB)`);
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Relative luminance of a colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    // sRGB -> linear light.
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (order does not matter). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Thresholds from the design doc section 9. */
export const WCAG_TEXT = 4.5; // normal text
export const WCAG_LARGE_OR_UI = 3; // large text and UI components (icons, fills)
