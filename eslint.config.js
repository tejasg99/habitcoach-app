// eslint.config.js
//
// ESLint "flat config" for the app. Start from Expo's recommended rules
// (React, React Hooks, React Native, TypeScript, import checks) and add the
// few project rules below.

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// esquery selectors (ESLint's AST pattern syntax) used by the guard rails below.
const BORDER_SELECTORS = [
  {
    selector: 'Property[key.name=/^border.*Width$/]',
    message: 'No borders (docs/DESIGN.md). Separate with tone, spacing or shadow instead of borderWidth.',
  },
  {
    selector: 'Property[key.value=/^border.*Width$/]',
    message: 'No borders (docs/DESIGN.md). Separate with tone, spacing or shadow instead of borderWidth.',
  },
];

const RAW_COLOR_SELECTORS = [
  {
    selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
    message: 'No raw hex colours outside src/theme. Read the colour from useTheme() / useThemedStyles().',
  },
  {
    selector: 'Literal[value=/^(rgb|rgba|hsl|hsla)\\(/]',
    message: 'No raw rgb()/hsl() colours outside src/theme. Add a token in src/theme/tokens.ts instead.',
  },
];

module.exports = defineConfig([
  ...expoConfig,

  {
    rules: {
      // The project forbids logging tokens, passwords and request bodies.
      // Plain console.log is flagged so it can't sneak in; warn/error remain allowed.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Type-only imports are written `import type` / `import { type X }`,
      // so they are erased at build time and never create runtime imports.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // ---- Design-system guard rails (docs/DESIGN.md hard rules) ----------------
  // `no-restricted-syntax` is a single rule, so each file group below sets the
  // complete list of selectors that apply to it.

  {
    // Rule 1, everywhere in src/: no borders. Separate things with tone,
    // spacing and shadows instead. Catches borderWidth and the per-side
    // variants (borderTopWidth, borderStartWidth, ...), as identifiers or strings.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...BORDER_SELECTORS],
    },
  },
  {
    // Rule 2, everywhere in src/ EXCEPT the theme folder and tests: no raw
    // colours. Components must read colours from the theme tokens. Catches
    // hex strings ("#fff", "#1F5E43", "#1F5E4380") and rgb()/rgba()/hsl() strings.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', 'src/__tests__/**'],
    rules: {
      'no-restricted-syntax': ['error', ...BORDER_SELECTORS, ...RAW_COLOR_SELECTORS],
    },
  },

  {
    // Files ESLint should skip: generated code, build output, dependencies and
    // the gitignored reference scaffold in example/.
    ignores: ['src/api/schema.d.ts', 'node_modules/', 'dist/', '.expo/', 'example/', '.claude/'],
  },
]);
