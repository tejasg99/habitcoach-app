// eslint.config.js
//
// ESLint "flat config" for the app. Start from Expo's recommended rules
// (React, React Hooks, React Native, TypeScript, import checks) and add the
// few project rules below.

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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

  {
    // Files ESLint should skip: generated code, build output, dependencies and
    // the gitignored reference scaffold in example/.
    ignores: ['src/api/schema.d.ts', 'node_modules/', 'dist/', '.expo/', 'example/', '.claude/'],
  },
]);
