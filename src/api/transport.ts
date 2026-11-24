/**
 * src/api/transport.ts
 *
 * The `fetch` function the API client uses. It wraps the platform fetch with:
 *
 *  - Timeouts. The API sleeps when idle and the first request after a quiet
 *    period can take 60 to 90 s, so a request gets 90 s when the server is
 *    "cold" (no response received yet since launch, or none for 10 minutes)
 *    and 30 s otherwise. A timeout throws `TimeoutError`.
 *  - Slow-request tracking. After ~5 s in flight a request is counted as slow
 *    (see status.ts), which shows the "Waking up the server..." message.
 *  - Long requests. `POST /plan/generate` calls an LLM and can take about a
 *    minute by design, so it gets its own 120 s timeout (brief: "Latency and
 *    cold starts") and is NOT counted as slow: the plan screens show their own
 *    progress state, and "Waking up the server..." would be the wrong message.
 *
 * It knows nothing about auth or JSON: it only moves bytes. Auth lives in the
 * middleware (authMiddleware.ts), error meaning in errors.ts.
 */

import { clearSlowRequest, markRequestSlow } from './status';

/** Thrown when a request exceeds its timeout. Mapped to a friendly message in errors.ts. */
export class TimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs} ms`);
    this.name = 'TimeoutError';
  }
}

export type TransportOptions = {
  /** The real fetch (injected in tests). */
  fetch?: typeof globalThis.fetch;
  /** Timeout while the server may be asleep. Default 90 s (brief: "Latency and cold starts"). */
  coldTimeoutMs?: number;
  /** Timeout once the server has answered recently. Default 30 s. */
  warmTimeoutMs?: number;
  /** After this long without any response, treat the server as cold again. Default 10 min. */
  coldAfterIdleMs?: number;
  /** When a request counts as "slow" and the waking message appears. Default 5 s. */
  slowAfterMs?: number;
  /** Clock (injected in tests). */
  now?: () => number;
  /** Requests that are slow by design. Default: POST /plan/generate. */
  longRequests?: readonly LongRequest[];
};

/** A request (method + path, no query) that gets `timeoutMs` and no "slow" tracking. */
export type LongRequest = { method: string; path: string; timeoutMs: number };

export const DEFAULT_COLD_TIMEOUT_MS = 90_000;
export const DEFAULT_WARM_TIMEOUT_MS = 30_000;
export const DEFAULT_COLD_AFTER_IDLE_MS = 10 * 60_000;
export const DEFAULT_SLOW_AFTER_MS = 5_000;
export const GENERATE_PLAN_TIMEOUT_MS = 120_000;

export const DEFAULT_LONG_REQUESTS: readonly LongRequest[] = [
  { method: 'POST', path: '/plan/generate', timeoutMs: GENERATE_PLAN_TIMEOUT_MS },
];

/**
 * Finds the long-request rule for this call, if any. Compares the URL's path
 * (query and fragment stripped) by suffix, so the base URL may carry a prefix.
 * Plain string work instead of `new URL()`, which is incomplete in some
 * React Native runtimes.
 */
export function findLongRequest(
  rules: readonly LongRequest[],
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): LongRequest | undefined {
  const url = input instanceof Request ? input.url : String(input);
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const path = url.split(/[?#]/)[0] ?? '';
  return rules.find((rule) => rule.method === method && path.endsWith(rule.path));
}

export function createTransport(options: TransportOptions = {}): typeof globalThis.fetch {
  const {
    fetch: baseFetch = (...args) => globalThis.fetch(...args),
    coldTimeoutMs = DEFAULT_COLD_TIMEOUT_MS,
    warmTimeoutMs = DEFAULT_WARM_TIMEOUT_MS,
    coldAfterIdleMs = DEFAULT_COLD_AFTER_IDLE_MS,
    slowAfterMs = DEFAULT_SLOW_AFTER_MS,
    now = Date.now,
    longRequests = DEFAULT_LONG_REQUESTS,
  } = options;

  // Time of the last response of any status. null = nothing received since launch.
  let lastResponseAt: number | null = null;

  return async function transport(input, init) {
    const cold = lastResponseAt === null || now() - lastResponseAt > coldAfterIdleMs;
    const long = findLongRequest(longRequests, input, init);
    const timeoutMs = long ? long.timeoutMs : cold ? coldTimeoutMs : warmTimeoutMs;

    // Our own abort controller drives the timeout. If the caller passed a
    // signal of its own, aborting it still aborts the request.
    const controller = new AbortController();
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const forwardAbort = () => controller.abort();
    if (callerSignal?.aborted) forwardAbort(); // aborted before we got here
    callerSignal?.addEventListener('abort', forwardAbort);

    let timedOut = false;
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    // Long requests skip the "waking" signal (see the header comment).
    let markedSlow = false;
    const slowTimer = long
      ? undefined
      : setTimeout(() => {
          markedSlow = true;
          markRequestSlow();
        }, slowAfterMs);

    try {
      const response = await baseFetch(input, { ...init, signal: controller.signal });
      lastResponseAt = now();
      return response;
    } catch (error) {
      if (timedOut) throw new TimeoutError(timeoutMs);
      throw error;
    } finally {
      clearTimeout(timeoutTimer);
      clearTimeout(slowTimer);
      callerSignal?.removeEventListener('abort', forwardAbort);
      if (markedSlow) clearSlowRequest();
    }
  };
}
