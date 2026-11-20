/**
 * Plan generation flow: error mapping for every status of POST /plan/generate
 * and the state machine (one run at a time, no automatic retries, waits before
 * retrying, one retry after a 409 "just generated").
 *
 * Uses the real `mapApiError`, a fake `generate` and a manual clock.
 */

import { mapApiError, type ApiError } from '@/api/errors';
import { TimeoutError } from '@/api/transport';
import {
  CONFLICT_RETRY_WAIT_SECONDS,
  GENERATE_COPY,
  canStart,
  createPlanGenerator,
  describeGenerateFailure,
  generatingCopy,
  secondsUntilRetry,
  type GenerateState,
  type RetryPolicy,
} from '@/features/plan/generate';

/** An ApiError exactly as the client would produce it for this response. */
function httpError(status: number, detail: unknown = 'x', headers: Record<string, string> = {}): ApiError {
  return mapApiError({
    operation: 'generate_weekly_plan',
    status,
    body: typeof detail === 'string' ? { detail } : detail,
    headers: new Headers(headers),
  });
}

const ONBOARDING_409 = () => httpError(409, 'Complete onboarding before generating a plan');
const JUST_FINISHED_409 = () => httpError(409, 'A plan generation just finished; try again');

describe('describeGenerateFailure (error table for POST /plan/generate)', () => {
  it('409 onboarding incomplete -> onboarding, no retry', () => {
    expect(describeGenerateFailure(ONBOARDING_409(), false)).toMatchObject({
      kind: 'onboarding',
      retry: { type: 'none' },
    });
  });

  it('409 just generated -> one retry after a short wait, and checks for the plan', () => {
    expect(describeGenerateFailure(JUST_FINISHED_409(), false)).toMatchObject({
      kind: 'justGenerated',
      message: GENERATE_COPY.justGenerated,
      retry: { type: 'after', seconds: CONFLICT_RETRY_WAIT_SECONDS },
      checkForPlan: true,
    });
  });

  it('409 just generated on the retry -> no further retry', () => {
    expect(describeGenerateFailure(JUST_FINISHED_409(), true)).toMatchObject({
      kind: 'justGenerated',
      message: GENERATE_COPY.justGeneratedAgain,
      retry: { type: 'none' },
      checkForPlan: true,
    });
  });

  it('429 -> "try again tomorrow", no retry', () => {
    const failure = describeGenerateFailure(httpError(429, 'Daily plan generation limit reached'), false);
    expect(failure.kind).toBe('dailyLimit');
    expect(failure.message).toMatch(/tomorrow/);
    expect(failure.retry).toEqual({ type: 'none' });
  });

  it('502 -> retry now, offers debug info, never shows the server detail', () => {
    const failure = describeGenerateFailure(httpError(502, 'LLM said something odd'), false);
    expect(failure).toMatchObject({ kind: 'generatorFailed', retry: { type: 'now' }, showDebugInfo: true });
    expect(failure.message).not.toMatch(/LLM/);
  });

  it('503 with Retry-After -> retry after those seconds', () => {
    expect(describeGenerateFailure(httpError(503, 'busy', { 'Retry-After': '30' }), false)).toMatchObject({
      kind: 'generatorBusy',
      retry: { type: 'after', seconds: 30 },
    });
  });

  it('503 without Retry-After -> retry now', () => {
    expect(describeGenerateFailure(httpError(503), false).retry).toEqual({ type: 'now' });
  });

  it('timeout -> retry now, with its own copy, and checks for the plan', () => {
    const timeout = mapApiError({ operation: 'generate_weekly_plan', cause: new TimeoutError(120_000) });
    expect(describeGenerateFailure(timeout, false)).toMatchObject({
      kind: 'timeout',
      message: GENERATE_COPY.timeout,
      retry: { type: 'now' },
      checkForPlan: true,
    });
  });

  it('network error (also a raw thrown error) -> retry now, checks for the plan', () => {
    expect(describeGenerateFailure(new TypeError('Network request failed'), false)).toMatchObject({
      kind: 'network',
      retry: { type: 'now' },
      checkForPlan: true,
    });
  });

  it('other 5xx -> retry now with debug info; plain-text bodies are fine', () => {
    const failure = describeGenerateFailure(
      mapApiError({ operation: 'generate_weekly_plan', status: 500, body: 'Internal Server Error' }),
      false,
    );
    expect(failure).toMatchObject({ kind: 'other', retry: { type: 'now' }, showDebugInfo: true });
  });
});

describe('retry timing helpers', () => {
  const failed = (retry: RetryPolicy, failedAt = 1_000): GenerateState => ({
    status: 'failed',
    failedAt,
    failure: { kind: 'other', message: 'm', retry, checkForPlan: false, showDebugInfo: false },
  });

  it('counts down whole seconds and then allows a start', () => {
    const state = failed({ type: 'after', seconds: 5 });
    expect(secondsUntilRetry(state, 1_000)).toBe(5);
    expect(secondsUntilRetry(state, 1_001)).toBe(5);
    expect(secondsUntilRetry(state, 5_500)).toBe(1);
    expect(canStart(state, 5_999)).toBe(false);
    expect(canStart(state, 6_000)).toBe(true);
  });

  it('never allows a start while running or when no retry is offered', () => {
    expect(canStart({ status: 'running', startedAt: 0, afterConflict: false }, 999_999)).toBe(false);
    expect(canStart(failed({ type: 'none' }), 999_999)).toBe(false);
    expect(canStart({ status: 'idle' }, 0)).toBe(true);
  });
});

describe('generatingCopy', () => {
  it('moves through the stages and never reports completion', () => {
    expect(generatingCopy(0).title).toBe('Reading your answers');
    expect(generatingCopy(20).title).toBe('Planning 7 days');
    expect(generatingCopy(60).title).toBe('Nearly there');
    expect(generatingCopy(0).progress).toBe(0);
    expect(generatingCopy(10_000).progress).toBeLessThan(1);
    expect(generatingCopy(30).progress).toBeGreaterThan(generatingCopy(10).progress);
  });
});

describe('createPlanGenerator (state machine)', () => {
  /** A generate() whose calls the test resolves or rejects by hand. */
  function setup() {
    let clock = 10_000;
    const pending: { resolve: (plan: string) => void; reject: (e: unknown) => void }[] = [];
    const deps = {
      generate: jest.fn(
        () =>
          new Promise<string>((resolve, reject) => {
            pending.push({ resolve, reject });
          }),
      ),
      onSuccess: jest.fn(),
      onNeedsOnboarding: jest.fn(),
      onPlanMayExist: jest.fn(),
      now: () => clock,
    };
    const generator = createPlanGenerator(deps);
    const states: GenerateState['status'][] = [];
    generator.subscribe(() => states.push(generator.getState().status));
    return {
      generator,
      deps,
      states,
      last: () => pending[pending.length - 1]!,
      advance: (ms: number) => {
        clock += ms;
      },
    };
  }

  it('idle -> running -> idle on 201, handing the plan to onSuccess', async () => {
    const { generator, deps, states, last } = setup();
    const run = generator.start();
    expect(generator.getState()).toMatchObject({ status: 'running', startedAt: 10_000, afterConflict: false });
    last().resolve('plan-1');
    await run;
    expect(deps.onSuccess).toHaveBeenCalledWith('plan-1');
    expect(generator.getState()).toEqual({ status: 'idle' });
    expect(states).toEqual(['running', 'idle']);
  });

  it('ignores presses while a run is in flight (one generation at a time)', async () => {
    const { generator, deps, last } = setup();
    const run = generator.start();
    void generator.start();
    void generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(1);
    last().resolve('plan');
    await run;
  });

  it('never retries by itself after a failure', async () => {
    const { generator, deps, last } = setup();
    const run = generator.start();
    last().reject(httpError(502));
    await run;
    expect(generator.getState()).toMatchObject({ status: 'failed', failure: { kind: 'generatorFailed' } });
    await Promise.resolve();
    expect(deps.generate).toHaveBeenCalledTimes(1);

    // A person pressing "Try again" starts a new run.
    const retry = generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(2);
    last().resolve('plan');
    await retry;
    expect(generator.getState().status).toBe('idle');
  });

  it('409 onboarding -> routes to onboarding and goes back to idle', async () => {
    const { generator, deps, last } = setup();
    const run = generator.start();
    last().reject(ONBOARDING_409());
    await run;
    expect(deps.onNeedsOnboarding).toHaveBeenCalledTimes(1);
    expect(generator.getState()).toEqual({ status: 'idle' });
  });

  it('409 just generated -> waits, allows exactly one retry, and refreshes the plan', async () => {
    const { generator, deps, last, advance } = setup();
    let run = generator.start();
    last().reject(JUST_FINISHED_409());
    await run;
    expect(deps.onPlanMayExist).toHaveBeenCalledTimes(1);

    // Too early: ignored.
    advance(CONFLICT_RETRY_WAIT_SECONDS * 1000 - 1);
    void generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(1);

    // After the wait: the one retry runs, marked as such.
    advance(1);
    run = generator.start();
    expect(generator.getState()).toMatchObject({ status: 'running', afterConflict: true });
    last().reject(JUST_FINISHED_409());
    await run;

    // Second 409: no more retries, however long we wait.
    expect(generator.getState()).toMatchObject({ status: 'failed', failure: { retry: { type: 'none' } } });
    advance(60 * 60_000);
    void generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(2);
  });

  it('429 -> failure with no retry until dismissed', async () => {
    const { generator, deps, last } = setup();
    const run = generator.start();
    last().reject(httpError(429));
    await run;
    void generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(1);

    generator.dismiss();
    expect(generator.getState()).toEqual({ status: 'idle' });
  });

  it('503 with Retry-After -> retry blocked for that many seconds', async () => {
    const { generator, deps, last, advance } = setup();
    const run = generator.start();
    last().reject(httpError(503, 'busy', { 'Retry-After': '30' }));
    await run;
    expect(secondsUntilRetry(generator.getState(), 10_000)).toBe(30);
    advance(29_000);
    void generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(1);
    advance(1_000);
    void generator.start();
    expect(deps.generate).toHaveBeenCalledTimes(2);
  });

  it('timeout -> checks whether the plan arrived anyway', async () => {
    const { generator, deps, last } = setup();
    const run = generator.start();
    last().reject(new TimeoutError(120_000));
    await run;
    expect(deps.onPlanMayExist).toHaveBeenCalledTimes(1);
    expect(generator.getState()).toMatchObject({ status: 'failed', failure: { kind: 'timeout' } });
  });

  it('401 after a failed refresh -> back to idle quietly (the session handles login)', async () => {
    const { generator, last } = setup();
    const run = generator.start();
    last().reject(httpError(401));
    await run;
    expect(generator.getState()).toEqual({ status: 'idle' });
  });

  it('reset drops a run in flight: its late result changes nothing', async () => {
    const { generator, deps, last } = setup();
    const run = generator.start();
    generator.reset();
    expect(generator.getState()).toEqual({ status: 'idle' });
    last().resolve('late-plan');
    await run;
    expect(deps.onSuccess).not.toHaveBeenCalled();
    expect(generator.getState()).toEqual({ status: 'idle' });
  });
});
