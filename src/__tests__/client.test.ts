/**
 * Smoke test for the typed API client skeleton: it calls the configured base
 * URL with the path from the generated schema. A fake fetch is injected, so
 * no network is used.
 */

import { createApiClient } from '@/api/client';

describe('createApiClient', () => {
  it('sends GET /health to the base URL and returns the parsed body', async () => {
    const fakeFetch = jest.fn(async (_request: Request) =>
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createApiClient('http://localhost:8000', fakeFetch as typeof fetch);
    const { data, error } = await client.GET('/health');

    expect(error).toBeUndefined();
    expect(data).toEqual({ status: 'ok' });

    const request = fakeFetch.mock.calls[0]![0];
    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://localhost:8000/health');
  });
});
