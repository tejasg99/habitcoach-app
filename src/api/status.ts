/**
 * src/api/status.ts
 *
 * Two tiny observable stores fed by the API transport, readable from React:
 *
 *  1. "Is the server waking up?" Any request that has been in flight for more
 *     than ~5 s flips this on, so the UI can say "Waking up the server..."
 *     instead of looking frozen (the free-tier API sleeps when idle).
 *
 *  2. "Last failed request" diagnostics: the X-Request-ID of the most recent
 *     failed call, plus method, path and status. A later "Copy debug info"
 *     action reads it. It never holds tokens, bodies or query strings.
 *
 * Both are plain modules (no React context) so the non-React client code can
 * write to them, and `useSyncExternalStore` lets components subscribe.
 */

import { useSyncExternalStore } from 'react';

type Listener = () => void;

/** Minimal store: a value, a setter that notifies, and a subscribe function. */
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Slow request tracking
// ---------------------------------------------------------------------------

/** Number of in-flight requests that have passed the "slow" threshold. */
const slowRequests = createStore(0);

/** Called by the transport when a request crosses the slow threshold. */
export function markRequestSlow(): void {
  slowRequests.set(slowRequests.get() + 1);
}

/** Called by the transport when a request that was marked slow settles. */
export function clearSlowRequest(): void {
  slowRequests.set(Math.max(0, slowRequests.get() - 1));
}

/** True while at least one request has been waiting for more than ~5 s. */
export function useServerWaking(): boolean {
  const count = useSyncExternalStore(slowRequests.subscribe, slowRequests.get, slowRequests.get);
  return count > 0;
}

/** Non-React read, used by tests. */
export function isServerWaking(): boolean {
  return slowRequests.get() > 0;
}

// ---------------------------------------------------------------------------
// Failed request diagnostics
// ---------------------------------------------------------------------------

export type FailedRequestInfo = {
  /** The server's X-Request-ID if a response arrived, otherwise the one we sent. */
  requestId: string | null;
  method: string;
  /** Path only (no host, no query string). */
  path: string;
  /** HTTP status, or null for network errors and timeouts. */
  status: number | null;
  /** ISO timestamp (device clock; only for the debug text, never sent to the API). */
  at: string;
};

const lastFailure = createStore<FailedRequestInfo | null>(null);

export function recordFailedRequest(info: FailedRequestInfo): void {
  lastFailure.set(info);
}

/** The most recent failed request, for "Copy debug info". */
export function getLastFailedRequest(): FailedRequestInfo | null {
  return lastFailure.get();
}

export function useLastFailedRequest(): FailedRequestInfo | null {
  return useSyncExternalStore(lastFailure.subscribe, lastFailure.get, lastFailure.get);
}

/** Test helper: reset both stores. */
export function resetApiStatusForTests(): void {
  slowRequests.set(0);
  lastFailure.set(null);
}
