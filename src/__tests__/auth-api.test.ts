/**
 * Login request shape: form-encoded, email in `username`, tokens saved to
 * secure storage (mocked here) and never anywhere else.
 */

import { createApiClient } from '@/api/client';
import { formEncode, login } from '@/features/auth/api';
import { saveTokens } from '@/lib/storage';

jest.mock('@/lib/storage', () => ({
  saveTokens: jest.fn(async () => undefined),
  secureTokenStore: {},
}));

describe('formEncode', () => {
  it('encodes special characters and skips empty optional fields', () => {
    expect(formEncode({ username: 'a+b@x.co', password: 'p& =ss', client_id: null, scope: '' })).toBe(
      'username=a%2Bb%40x.co&password=p%26%20%3Dss&scope=',
    );
  });
});

describe('login', () => {
  it('posts a form-encoded body with the email as username and saves the tokens', async () => {
    const fetch = jest.fn(async (_input: RequestInfo | URL) =>
      new Response(JSON.stringify({ access_token: 'a1', refresh_token: 'r1', token_type: 'bearer' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:8000',
      fetch: fetch as typeof globalThis.fetch,
      tokens: {
        getAccessToken: async () => null,
        getRefreshToken: async () => null,
        saveTokens: async () => undefined,
        clearTokens: async () => undefined,
      },
      onSessionExpired: jest.fn(),
    });

    await login('me@example.com', 'secret-pass', client);

    const request = fetch.mock.calls[0]![0] as Request;
    expect(request.url).toBe('http://localhost:8000/auth/login');
    expect(request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(await request.clone().text()).toBe('username=me%40example.com&password=secret-pass&scope=');
    expect(saveTokens).toHaveBeenCalledWith('a1', 'r1');
  });
});
