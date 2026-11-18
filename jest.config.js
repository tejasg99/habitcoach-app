/**
 * jest.config.js
 *
 * Jest setup for the app. The `jest-expo` preset already configures the React
 * Native / Expo transformer, platform file extensions and the
 * transformIgnorePatterns list, so we only add what is specific to this repo.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  // Runs once per test file, after the test framework is installed. We use it
  // to register React Native Testing Library's built-in matchers
  // (toBeOnTheScreen, toHaveTextContent, ...). See jest.setup.js.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Mirror the "@/*" path alias from tsconfig.json so `import ... from '@/lib/env'`
  // resolves inside tests exactly like it does in the app.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // `example/` is a gitignored reference scaffold, not part of the app.
  testPathIgnorePatterns: ['/node_modules/', '/example/'],

  // Coverage only for our own source, never the generated API types.
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
