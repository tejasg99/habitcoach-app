/**
 * jest.setup.js
 *
 * Registers React Native Testing Library's built-in matchers on `expect`.
 * (The old @testing-library/jest-native package is deprecated and not used.)
 */
const matchers = require('@testing-library/react-native/matchers');

expect.extend(matchers);

// src/lib/env.ts validates EXPO_PUBLIC_API_URL when it is first imported, and
// import statements run before any code in a test file. Setting a test value
// here (before every test file) keeps modules that import the env module loadable.
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
