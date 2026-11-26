/**
 * The central error mapping (brief: "Error handling" table): one case per
 * row, plus the defensive cases (non-JSON bodies, thrown errors).
 */

import { ERROR_COPY, isUnexpectedError, mapApiError, parseFieldErrors, type ApiOperation } from '@/api/errors';
import { TimeoutError } from '@/api/transport';
import { splitFieldErrors } from '@/features/auth/forms';

const map = (operation: ApiOperation, status: number, body: unknown = { detail: 'x' }, headers?: HeadersInit) =>
  mapApiError({ operation, status, body, headers: new Headers(headers) });

describe('mapApiError', () => {
  it.each<[ApiOperation, number, string, string, string]>([
    // operation, status, kind, action, message
    ['read_me', 401, 'sessionExpired', 'login', ERROR_COPY.sessionExpired],
    ['login', 401, 'invalidCredentials', 'none', 'Incorrect email or password'],
    ['read_my_profile', 404, 'notFound', 'onboarding', ERROR_COPY.onboardingMissing],
    ['get_today_plan', 404, 'notFound', 'generatePlan', ERROR_COPY.noPlan],
    ['get_week_plan', 404, 'notFound', 'generatePlan', ERROR_COPY.noPlan],
    ['create_log', 404, 'notFound', 'refreshToday', ERROR_COPY.staleItem],
    ['create_log', 409, 'conflict', 'refreshToday', ERROR_COPY.staleItem],
    ['remove_log', 409, 'conflict', 'none', ERROR_COPY.undoOnlyToday],
    ['signup', 409, 'conflict', 'login', ERROR_COPY.emailTaken],
    ['generate_weekly_plan', 429, 'rateLimited', 'none', ERROR_COPY.planLimit],
    ['login', 429, 'rateLimited', 'none', 'Too many attempts, try again later'],
    ['generate_weekly_plan', 502, 'generatorFailed', 'retry', ERROR_COPY.generatorFailed],
    ['generate_weekly_plan', 503, 'generatorBusy', 'retry', ERROR_COPY.generatorBusy],
    ['read_me', 500, 'server', 'retry', ERROR_COPY.server],
    ['read_me', 504, 'server', 'retry', ERROR_COPY.server],
  ])('%s %i -> %s / %s', (operation, status, kind, action, message) => {
    const error = map(operation, status);
    expect(error).toMatchObject({ kind, action, status, operation, message });
  });

  it('tells the two 409s of /plan/generate apart', () => {
    expect(
      map('generate_weekly_plan', 409, { detail: 'Complete onboarding before generating a plan' }),
    ).toMatchObject({ action: 'onboarding' });
    expect(map('generate_weekly_plan', 409, { detail: 'A plan generation just finished; try again' })).toMatchObject({
      action: 'retry',
      message: ERROR_COPY.generationJustFinished,
    });
  });

  it('maps 422 detail lists to field errors', () => {
    const error = map('signup', 422, {
      detail: [
        { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
        { loc: ['body', 'password'], msg: 'String should have at least 8 characters', type: 'string_too_short' },
        { loc: ['body'], msg: 'Value error, something general', type: 'value_error' },
      ],
    });
    expect(error.kind).toBe('validation');
    expect(error.fieldErrors).toEqual({
      email: 'value is not a valid email address',
      password: 'String should have at least 8 characters',
      '': 'something general',
    });
  });

  it('reads Retry-After and X-Request-ID headers', () => {
    const error = map('login', 429, { detail: 'Too many' }, { 'Retry-After': '900', 'X-Request-ID': 'abc12345' });
    expect(error.retryAfterSeconds).toBe(900);
    expect(error.requestId).toBe('abc12345');
  });

  it('never exposes a raw 5xx body, including plain text', () => {
    const error = map('read_me', 500, 'Traceback (most recent call last): ...');
    expect(error.message).toBe(ERROR_COPY.server);
    expect(error.fieldErrors).toEqual({});
  });

  it('maps thrown errors: timeout, network, unexpected', () => {
    expect(mapApiError({ operation: 'read_me', cause: new TimeoutError(90_000) })).toMatchObject({
      kind: 'timeout',
      status: null,
      action: 'retry',
    });
    expect(mapApiError({ operation: 'read_me', cause: new TypeError('Network request failed') })).toMatchObject({
      kind: 'network',
      status: null,
    });
    expect(mapApiError({ operation: 'read_me', cause: new SyntaxError('Unexpected token') })).toMatchObject({
      kind: 'unexpected',
    });
  });
});

describe('parseFieldErrors', () => {
  it('ignores bodies that are not a 422 list', () => {
    expect(parseFieldErrors('plain text')).toEqual({});
    expect(parseFieldErrors({ detail: 'a string' })).toEqual({});
    expect(parseFieldErrors(null)).toEqual({});
  });
});

describe('splitFieldErrors (form wiring)', () => {
  it("maps login's `username` to the email field and keeps unknown fields as a form message", () => {
    const error = map('login', 422, {
      detail: [
        { loc: ['body', 'username'], msg: 'Field required', type: 'missing' },
        { loc: ['body', 'grant_type'], msg: 'Bad grant', type: 'x' },
      ],
    });
    expect(splitFieldErrors(error, { username: 'email', password: 'password' })).toEqual({
      fields: { email: 'Field required' },
      formMessage: 'Bad grant',
    });
  });

  it('falls back to the generic message when a 422 has no usable detail', () => {
    const error = map('signup', 422, 'not json');
    expect(splitFieldErrors(error, { email: 'email' })).toEqual({ fields: {}, formMessage: ERROR_COPY.validation });
  });
});

describe('isUnexpectedError (when to offer Copy debug info)', () => {
  it('is true for 5xx, timeouts, network failures and non-API errors', () => {
    expect(isUnexpectedError(map('read_me', 500))).toBe(true);
    expect(isUnexpectedError(mapApiError({ operation: 'read_me', cause: new TimeoutError(90_000) }))).toBe(true);
    expect(isUnexpectedError(mapApiError({ operation: 'read_me', cause: new TypeError('Network request failed') }))).toBe(true);
    expect(isUnexpectedError(new Error('bug'))).toBe(true);
  });

  it('is false for expected answers and for no error', () => {
    for (const [operation, status] of [
      ['get_today_plan', 404],
      ['remove_log', 409],
      ['update_my_profile', 422],
      ['generate_weekly_plan', 429],
      ['read_me', 401],
      ['generate_weekly_plan', 503],
    ] as const) {
      expect(isUnexpectedError(map(operation, status))).toBe(false);
    }
    expect(isUnexpectedError(null)).toBe(false);
    expect(isUnexpectedError(undefined)).toBe(false);
  });
});
