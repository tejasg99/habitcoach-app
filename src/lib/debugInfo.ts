/**
 * The text that "Copy debug info" puts on the clipboard (brief: "Debugging
 * support"). It holds only what helps find the request in the server logs:
 * the latest X-Request-ID, the last failed request's X-Request-ID, method, path template, status and time, plus the app
 * version and platform. Never tokens, passwords, request bodies or user ids.
 */

import type { FailedRequestInfo } from '@/api/status';

export type DebugContext = {
  appVersion: string | null;
  /** e.g. "android 35" or "ios 18.2". */
  platform: string;
  /** X-Request-ID of the most recent request, failed or not. */
  latestRequestId?: string | null;
};

export function formatDebugInfo(failure: FailedRequestInfo | null, context: DebugContext): string {
  const lines = [`App: ${context.appVersion ?? 'unknown'} (${context.platform})`];
  if (context.latestRequestId) lines.push(`Latest request ID: ${context.latestRequestId}`);
  if (failure) {
    lines.push(
      `Request ID: ${failure.requestId ?? 'none'}`,
      `Request: ${failure.method} ${failure.path}`,
      `Status: ${failure.status ?? 'no response (network error or timeout)'}`,
      `Time: ${failure.at}`,
    );
  } else {
    lines.push('No failed request recorded since the app started');
  }
  return lines.join('\n');
}
