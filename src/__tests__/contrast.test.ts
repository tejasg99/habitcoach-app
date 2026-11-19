/**
 * Colour accessibility test (design doc sections 3 and 9).
 *
 * Checks real WCAG contrast ratios on the actual theme tokens, for both modes
 * and all five accents. If someone edits a token to something that no longer
 * meets the ratio, the matching test fails and names the pair and the ratio.
 *
 * Thresholds: 4.5:1 for text, 3:1 for large text and UI components.
 */

import { contrastRatio, WCAG_LARGE_OR_UI, WCAG_TEXT } from '@/theme/contrast';
import { ACCENT_KEYS, buildColors, type Mode } from '@/theme/tokens';

const MODES: Mode[] = ['light', 'dark'];

/** Assert a pair meets a ratio, with a message that says exactly which pair failed. */
function expectRatio(label: string, fg: string, bg: string, min: number) {
  const ratio = contrastRatio(fg, bg);
  // Putting the label in the received value makes a failure readable.
  expect({ pair: label, ok: ratio >= min, ratio: Number(ratio.toFixed(2)), min }).toEqual({
    pair: label,
    ok: true,
    ratio: Number(ratio.toFixed(2)),
    min,
  });
}

describe('contrastRatio helper', () => {
  it('matches known WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Order does not matter.
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#777777'), 10);
    // Well-known value: #767676 on white is just over 4.5:1.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5);
  });
});

describe.each(MODES)('neutral text on surfaces (%s mode)', (mode) => {
  const c = buildColors(mode, 'sage');
  const surfaces = ['bg', 'surface', 'surfaceRaised', 'surfaceMuted'] as const;

  it.each(surfaces)('textPrimary on %s is at least 4.5:1', (s) => {
    expectRatio(`${mode} textPrimary/${s}`, c.textPrimary, c[s], WCAG_TEXT);
  });

  it.each(surfaces)('textSecondary on %s is at least 4.5:1', (s) => {
    expectRatio(`${mode} textSecondary/${s}`, c.textSecondary, c[s], WCAG_TEXT);
  });

  // textTertiary is for hints, disabled states and inactive icons, never body
  // copy, so the UI-component threshold (3:1) applies. It is NOT checked on
  // surfaceMuted: it misses 3:1 there in light mode, which is why inputs use
  // textSecondary for placeholders.
  it.each(['bg', 'surface', 'surfaceRaised'] as const)('textTertiary on %s is at least 3:1', (s) => {
    expectRatio(`${mode} textTertiary/${s}`, c.textTertiary, c[s], WCAG_LARGE_OR_UI);
  });
});

describe.each(MODES)('semantic colours (%s mode)', (mode) => {
  const c = buildColors(mode, 'sage');

  it.each([
    ['successText', 'successSoft'],
    ['warningText', 'warningSoft'],
    ['dangerText', 'dangerSoft'],
  ] as const)('%s on its soft background %s is at least 4.5:1', (fg, bg) => {
    expectRatio(`${mode} ${fg}/${bg}`, c[fg], c[bg], WCAG_TEXT);
  });

  it.each(['successText', 'warningText', 'dangerText'] as const)('%s on bg and surface is at least 4.5:1', (fg) => {
    expectRatio(`${mode} ${fg}/bg`, c[fg], c.bg, WCAG_TEXT);
    expectRatio(`${mode} ${fg}/surface`, c[fg], c.surface, WCAG_TEXT);
  });

  it.each(['success', 'warning', 'danger'] as const)('%s used as an icon or fill on surface is at least 3:1', (fg) => {
    expectRatio(`${mode} ${fg}/surface`, c[fg], c.surface, WCAG_LARGE_OR_UI);
  });
});

describe.each(MODES)('accents (%s mode)', (mode) => {
  describe.each(ACCENT_KEYS)('%s', (accent) => {
    const c = buildColors(mode, accent);

    it('onAccent on accent (button label) is at least 4.5:1', () => {
      expectRatio(`${mode} ${accent} onAccent/accent`, c.onAccent, c.accent, WCAG_TEXT);
    });

    it('onAccent on accentDeep (pressed primary button) is at least 4.5:1', () => {
      // In dark mode the pressed state is a dimmed accent, not accentDeep, so only light needs this.
      if (mode === 'light') expectRatio(`${mode} ${accent} onAccent/accentDeep`, c.onAccent, c.accentDeep, WCAG_TEXT);
    });

    it('accentText (links, selected chips, soft and ghost buttons) is at least 4.5:1 on every surface it can sit on', () => {
      for (const surface of ['bg', 'surface', 'surfaceRaised', 'surfaceMuted', 'accentSoft'] as const) {
        expectRatio(`${mode} ${accent} accentText/${surface}`, c.accentText, c[surface], WCAG_TEXT);
      }
    });

    it('accent as a fill or icon (progress, check, active tab icon) is at least 3:1 on its surfaces', () => {
      for (const surface of ['bg', 'surface', 'surfaceRaised', 'surfaceMuted'] as const) {
        expectRatio(`${mode} ${accent} accent/${surface}`, c.accent, c[surface], WCAG_LARGE_OR_UI);
      }
      // The ring/bar fill must also stand out from its own accentSoft track.
      expectRatio(`${mode} ${accent} accent/accentSoft`, c.accent, c.accentSoft, WCAG_LARGE_OR_UI);
    });

    it('white text on both hero gradient stops is at least 4.5:1', () => {
      const [from, to] = c.heroGradient;
      expectRatio(`${mode} ${accent} onHero/heroStart`, c.onHero, from, WCAG_TEXT);
      expectRatio(`${mode} ${accent} onHero/heroEnd`, c.onHero, to, WCAG_TEXT);
    });
  });
});
