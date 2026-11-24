/**
 * "Copy debug info" text: request diagnostics only, never secrets.
 */

import { formatDebugInfo } from '@/lib/debugInfo';

const context = { appVersion: '1.0.0', platform: 'android 35' };

describe('formatDebugInfo', () => {
  it('lists the latest failed request', () => {
    const text = formatDebugInfo(
      { requestId: 'abc12345', method: 'GET', path: '/users/me', status: 500, at: '2026-11-20T08:00:00.000Z' },
      context,
    );
    expect(text).toBe(
      [
        'App: 1.0.0 (android 35)',
        'Request ID: abc12345',
        'Request: GET /users/me',
        'Status: 500',
        'Time: 2026-11-20T08:00:00.000Z',
      ].join('\n'),
    );
  });

  it('describes a network failure without a status', () => {
    const text = formatDebugInfo(
      { requestId: null, method: 'POST', path: '/auth/login', status: null, at: 't' },
      { appVersion: null, platform: 'ios 18.2' },
    );
    expect(text).toContain('App: unknown (ios 18.2)');
    expect(text).toContain('Request ID: none');
    expect(text).toContain('Status: no response (network error or timeout)');
  });

  it('includes the latest request id when there is one', () => {
    expect(formatDebugInfo(null, { ...context, latestRequestId: 'latest99' })).toBe(
      'App: 1.0.0 (android 35)\nLatest request ID: latest99\nNo failed request recorded since the app started',
    );
  });

  it('says so when nothing has failed', () => {
    expect(formatDebugInfo(null, context)).toBe(
      'App: 1.0.0 (android 35)\nNo failed request recorded since the app started',
    );
  });
});
