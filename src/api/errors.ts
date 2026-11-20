/**
 * src/api/errors.ts
 *
 * THE error-mapping function (brief: "Error handling" table). Every screen
 * turns API failures into user-facing state through `mapApiError` / `unwrap`,
 * so the same status always gets the same copy and the same next step.
 *
 * Inputs it copes with:
 *  - an HTTP error response (status + parsed body + headers)
 *  - a thrown error: network failure, `TimeoutError`, anything else
 *
 * Rules:
 *  - Never assume an error body is JSON (5xx can be plain text; openapi-fetch
 *    hands us a string then). The body is only read for 422 field errors and
 *    to tell the two 409s of /plan/generate apart.
 *  - Never show raw `detail` strings from 5xx. Copy comes from this file.
 */

import type { operations } from './schema';
import { TimeoutError } from './transport';

/** Operation ids from the generated contract, e.g. 'login', 'read_me', 'get_today_plan'. */
export type ApiOperation = keyof operations;

export type ApiErrorKind =
  | 'network' // no response (offline, DNS, connection reset)
  | 'timeout' // no response in time
  | 'invalidCredentials' // 401 on login
  | 'sessionExpired' // 401 anywhere else, after the refresh flow gave up
  | 'validation' // 422
  | 'notFound' // 404
  | 'conflict' // 409
  | 'rateLimited' // 429
  | 'generatorFailed' // 502
  | 'generatorBusy' // 503
  | 'server' // other 5xx
  | 'unexpected'; // anything else

/** What the screen should offer next. */
export type ApiErrorAction =
  | 'retry' // show a retry button
  | 'login' // go to (or offer) the login screen
  | 'onboarding' // route to onboarding
  | 'generatePlan' // show the "Generate my plan" action
  | 'refreshToday' // refetch the Today screen
  | 'none'; // just show the message

/** Field name -> message, from a 422 `detail` list. */
export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly operation: ApiOperation;
  /** HTTP status, or null when no response arrived. */
  readonly status: number | null;
  readonly action: ApiErrorAction;
  /** Messages for specific fields (422 only). */
  readonly fieldErrors: FieldErrors;
  /** From the Retry-After header, when present (429, 503). */
  readonly retryAfterSeconds: number | null;
  /** The response's X-Request-ID, for debug info. */
  readonly requestId: string | null;

  constructor(init: {
    kind: ApiErrorKind;
    operation: ApiOperation;
    status: number | null;
    message: string;
    action: ApiErrorAction;
    fieldErrors?: FieldErrors;
    retryAfterSeconds?: number | null;
    requestId?: string | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.operation = init.operation;
    this.status = init.status;
    this.action = init.action;
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.requestId = init.requestId ?? null;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

// ---------------------------------------------------------------------------
// Copy. Plain and calm; no raw server text except 422 field messages.
// ---------------------------------------------------------------------------

export const ERROR_COPY = {
  network: "Can't reach the server. Check your connection and try again.",
  timeout: 'The server is taking too long to answer. Try again in a moment.',
  invalidCredentials: 'Incorrect email or password',
  sessionExpired: 'Your session has ended. Log in again to continue.',
  validation: 'Some details need another look',
  emailTaken: 'An account with this email already exists',
  loginThrottled: 'Too many attempts, try again later',
  planLimit: "You've made 5 plans in the last 24 hours. Try again tomorrow.",
  rateLimited: 'Too many requests. Wait a moment and try again.',
  onboardingMissing: 'Finish setting up your profile first',
  noPlan: "You don't have a plan yet",
  staleItem: 'This item changed. Refreshing your day.',
  undoOnlyToday: "Only today's completions can be undone",
  generationJustFinished: 'A plan was just generated. Try again in a moment.',
  generatorFailed: "We couldn't build a plan this time. Try again.",
  generatorBusy: 'The plan builder is busy right now. Try again shortly.',
  server: 'Something went wrong on our side. Try again.',
  unexpected: 'Something went wrong. Try again.',
} as const;

// ---------------------------------------------------------------------------
// Body helpers (defensive: the body may be a string, null or anything)
// ---------------------------------------------------------------------------

function detailString(body: unknown): string | null {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    return typeof detail === 'string' ? detail : null;
  }
  return null;
}

/**
 * 422 `detail` is a list of `{ loc, msg, type }`. `loc` starts with where the
 * value came from ("body", "query", ...) followed by the field path, e.g.
 * ["body", "email"]. Errors without a field land under the "" key.
 */
export function parseFieldErrors(body: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (!body || typeof body !== 'object' || !('detail' in body)) return result;
  const detail = (body as { detail: unknown }).detail;
  if (!Array.isArray(detail)) return result;

  for (const item of detail) {
    if (!item || typeof item !== 'object') continue;
    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    if (typeof msg !== 'string') continue;
    const path = Array.isArray(loc) ? loc.slice(1).filter((p) => typeof p === 'string').join('.') : '';
    // Pydantic prefixes custom validator messages with "Value error, ".
    const message = msg.replace(/^Value error, /i, '');
    if (!(path in result)) result[path] = message;
  }
  return result;
}

function parseRetryAfter(headers: Headers | undefined): number | null {
  const raw = headers?.get('Retry-After');
  if (!raw) return null;
  const seconds = Number.parseInt(raw, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

// ---------------------------------------------------------------------------
// The mapping
// ---------------------------------------------------------------------------

export type MapErrorInput = {
  operation: ApiOperation;
  /** HTTP status when a response arrived. */
  status?: number;
  /** Parsed body (object or string) when a response arrived. */
  body?: unknown;
  headers?: Headers;
  /** The thrown error when no response arrived. */
  cause?: unknown;
};

export function mapApiError(input: MapErrorInput): ApiError {
  const { operation, status, body, headers, cause } = input;
  const requestId = headers?.get('X-Request-ID') ?? null;
  const retryAfterSeconds = parseRetryAfter(headers);

  const make = (kind: ApiErrorKind, message: string, action: ApiErrorAction, fieldErrors?: FieldErrors) =>
    new ApiError({
      kind,
      operation,
      status: status ?? null,
      message,
      action,
      fieldErrors,
      retryAfterSeconds,
      requestId,
    });

  // No response at all.
  if (status === undefined) {
    if (cause instanceof TimeoutError) return make('timeout', ERROR_COPY.timeout, 'retry');
    if (cause instanceof SyntaxError) return make('unexpected', ERROR_COPY.unexpected, 'retry');
    return make('network', ERROR_COPY.network, 'retry');
  }

  switch (status) {
    case 401:
      return operation === 'login'
        ? make('invalidCredentials', ERROR_COPY.invalidCredentials, 'none')
        : make('sessionExpired', ERROR_COPY.sessionExpired, 'login');

    case 404:
      switch (operation) {
        case 'read_my_profile':
        case 'update_my_profile':
          return make('notFound', ERROR_COPY.onboardingMissing, 'onboarding');
        case 'get_today_plan':
        case 'get_week_plan':
          return make('notFound', ERROR_COPY.noPlan, 'generatePlan');
        case 'create_log':
        case 'remove_log':
          return make('notFound', ERROR_COPY.staleItem, 'refreshToday');
        default:
          return make('notFound', ERROR_COPY.unexpected, 'retry');
      }

    case 409:
      switch (operation) {
        case 'signup':
          return make('conflict', ERROR_COPY.emailTaken, 'login');
        case 'generate_weekly_plan':
          // Two different 409s; the detail text is the only way to tell them apart.
          return /onboarding/i.test(detailString(body) ?? '')
            ? make('conflict', ERROR_COPY.onboardingMissing, 'onboarding')
            : make('conflict', ERROR_COPY.generationJustFinished, 'retry');
        case 'create_log':
          return make('conflict', ERROR_COPY.staleItem, 'refreshToday');
        case 'remove_log':
          return make('conflict', ERROR_COPY.undoOnlyToday, 'none');
        default:
          return make('conflict', ERROR_COPY.unexpected, 'retry');
      }

    case 422:
      return make('validation', ERROR_COPY.validation, 'none', parseFieldErrors(body));

    case 429:
      if (operation === 'login') return make('rateLimited', ERROR_COPY.loginThrottled, 'none');
      if (operation === 'generate_weekly_plan') return make('rateLimited', ERROR_COPY.planLimit, 'none');
      return make('rateLimited', ERROR_COPY.rateLimited, 'retry');

    case 502:
      return make('generatorFailed', ERROR_COPY.generatorFailed, 'retry');

    case 503:
      return make('generatorBusy', ERROR_COPY.generatorBusy, 'retry');

    default:
      if (status >= 500) return make('server', ERROR_COPY.server, 'retry');
      return make('unexpected', ERROR_COPY.unexpected, 'retry');
  }
}

/**
 * Await an openapi-fetch call and return its data, or throw an `ApiError`.
 *
 *   const user = await unwrap('read_me', apiClient.GET('/users/me'));
 */
export async function unwrap<R extends { data?: unknown; error?: unknown; response: Response }>(
  operation: ApiOperation,
  call: Promise<R>,
): Promise<Exclude<R['data'], undefined>> {
  let result: R;
  try {
    result = await call;
  } catch (cause) {
    throw isApiError(cause) ? cause : mapApiError({ operation, cause });
  }
  const { response } = result;
  if (!response.ok) {
    throw mapApiError({ operation, status: response.status, body: result.error, headers: response.headers });
  }
  return result.data as Exclude<R['data'], undefined>;
}
