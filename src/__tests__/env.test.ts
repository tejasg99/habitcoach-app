/**
 * Tests for the pure env validation in src/lib/env.ts.
 * Only parseApiUrl is tested; importing `env` would read process.env.
 */

import { parseApiUrl } from '@/lib/env';

describe('parseApiUrl', () => {
  it('returns a valid URL unchanged', () => {
    expect(parseApiUrl('https://example.com')).toBe('https://example.com');
  });

  it('keeps host:port and http', () => {
    expect(parseApiUrl('http://10.0.2.2:8000')).toBe('http://10.0.2.2:8000');
  });

  it('strips trailing slashes', () => {
    expect(parseApiUrl('https://example.com/')).toBe('https://example.com');
    expect(parseApiUrl('https://example.com///')).toBe('https://example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(parseApiUrl('  https://example.com/  ')).toBe('https://example.com');
  });

  it('throws a clear error when missing or blank', () => {
    expect(() => parseApiUrl(undefined)).toThrow(/EXPO_PUBLIC_API_URL is not set/);
    expect(() => parseApiUrl('')).toThrow(/EXPO_PUBLIC_API_URL is not set/);
    expect(() => parseApiUrl('   ')).toThrow(/EXPO_PUBLIC_API_URL is not set/);
  });

  it('throws when the scheme is missing', () => {
    expect(() => parseApiUrl('localhost:8000')).toThrow(/http:\/\/ or https:\/\//);
  });
});
