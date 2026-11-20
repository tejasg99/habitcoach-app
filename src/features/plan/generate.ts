/**
 * src/features/plan/generate.ts
 *
 * The plan-generation flow as plain, testable logic (no React, no network):
 *
 *   idle ──start──▶ running ──201──▶ idle (plan is in the cache)
 *                      │
 *                      └──error──▶ failed { failure } ──start (when allowed)──▶ running
 *
 * Rules from the brief ("Regenerating a plan", "Latency and cold starts",
 * error table):
 *  - Only one generation at a time; the button is disabled while running.
 *  - NEVER retried automatically. Every retry is a person pressing the button.
 *  - 409 "complete onboarding"  -> route to onboarding.
 *  - 409 "just finished"        -> one retry, offered after a short wait. A second
 *                                  409 offers no further retry. A plan probably
 *                                  exists by now, so the plan queries are refreshed.
 *  - 429                        -> "try again tomorrow", no retry.
 *  - 502                        -> retry button.
 *  - 503                        -> retry once the Retry-After seconds have passed
 *                                  (straight away if the header is missing).
 *  - timeout / network          -> retry button; the server may still have finished,
 *                                  so the plan queries are refreshed too.
 *
 * Timing uses an injected monotonic clock only to count down a wait. It never
 * works out calendar dates or "today".
 */

import { isApiError, mapApiError, type ApiError } from '@/api/errors';

/** Short pause before the single retry after a 409 "a generation just finished". */
export const CONFLICT_RETRY_WAIT_SECONDS = 5;

export type GenerateFailureKind =
  | 'onboarding' // 409, profile incomplete
  | 'justGenerated' // 409, another generation just finished
  | 'dailyLimit' // 429
  | 'generatorFailed' // 502
  | 'generatorBusy' // 503
  | 'timeout' // no answer within 120 s
  | 'network' // offline / connection dropped
  | 'sessionExpired' // 401 after refresh failed (the session store already routes to login)
  | 'other'; // other 5xx or anything unexpected

export type RetryPolicy =
  | { type: 'now' } // retry button enabled straight away
  | { type: 'after'; seconds: number } // retry button enabled after a wait
  | { type: 'none' }; // no retry offered

export type GenerateFailure = {
  kind: GenerateFailureKind;
  /** Friendly, plain copy. Never a raw server string. */
  message: string;
  retry: RetryPolicy;
  /** The request may have succeeded on the server anyway: refresh the plan queries. */
  checkForPlan: boolean;
  /** Offer "Copy debug info" (unexpected server-side failures). */
  showDebugInfo: boolean;
};

export type GenerateState =
  | { status: 'idle' }
  | {
      status: 'running';
      /** Clock value when it started (for the progress copy). */
      startedAt: number;
      /** This run is the one retry after a 409 "just generated". */
      afterConflict: boolean;
    }
  | { status: 'failed'; failure: GenerateFailure; failedAt: number };

export const GENERATE_COPY = {
  justGenerated: 'A plan was just generated. Try again in a moment.',
  justGeneratedAgain: "A plan was just generated. If it doesn't show up here, try again in a few minutes.",
  timeout: 'This is taking longer than usual. Your plan may still arrive, so check back in a minute or try again.',
} as const;

/** Turns whatever the generate call threw into what the screen shows and offers. */
export function describeGenerateFailure(error: unknown, afterConflict: boolean): GenerateFailure {
  const apiError: ApiError = isApiError(error) ? error : mapApiError({ operation: 'generate_weekly_plan', cause: error });
  const base = { message: apiError.message, checkForPlan: false, showDebugInfo: false };

  switch (apiError.kind) {
    case 'conflict':
      if (apiError.action === 'onboarding') {
        return { ...base, kind: 'onboarding', retry: { type: 'none' } };
      }
      return afterConflict
        ? {
            ...base,
            kind: 'justGenerated',
            message: GENERATE_COPY.justGeneratedAgain,
            retry: { type: 'none' },
            checkForPlan: true,
          }
        : {
            ...base,
            kind: 'justGenerated',
            message: GENERATE_COPY.justGenerated,
            retry: { type: 'after', seconds: CONFLICT_RETRY_WAIT_SECONDS },
            checkForPlan: true,
          };

    case 'rateLimited':
      return { ...base, kind: 'dailyLimit', retry: { type: 'none' } };

    case 'generatorFailed':
      return { ...base, kind: 'generatorFailed', retry: { type: 'now' }, showDebugInfo: true };

    case 'generatorBusy': {
      const seconds = apiError.retryAfterSeconds;
      return {
        ...base,
        kind: 'generatorBusy',
        retry: seconds && seconds > 0 ? { type: 'after', seconds } : { type: 'now' },
      };
    }

    case 'timeout':
      return { ...base, kind: 'timeout', message: GENERATE_COPY.timeout, retry: { type: 'now' }, checkForPlan: true };

    case 'network':
      return { ...base, kind: 'network', retry: { type: 'now' }, checkForPlan: true };

    case 'sessionExpired':
      return { ...base, kind: 'sessionExpired', retry: { type: 'none' } };

    default:
      return { ...base, kind: 'other', retry: { type: 'now' }, showDebugInfo: apiError.kind === 'server' };
  }
}

/** Whole seconds left before a retry is allowed (0 = allowed now, Infinity = never). */
export function secondsUntilRetry(state: GenerateState, now: number): number {
  if (state.status !== 'failed') return 0;
  const { retry } = state.failure;
  if (retry.type === 'now') return 0;
  if (retry.type === 'none') return Number.POSITIVE_INFINITY;
  const remainingMs = state.failedAt + retry.seconds * 1000 - now;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/** May a generation start right now? */
export function canStart(state: GenerateState, now: number): boolean {
  if (state.status === 'running') return false;
  return secondsUntilRetry(state, now) === 0;
}

/**
 * The words shown while a plan is being built, by elapsed seconds. A typical
 * run takes 20 to 60 s, so the copy moves on a few times instead of sitting
 * still. `progress` is a rough, never-complete estimate for the bar.
 */
export function generatingCopy(elapsedSeconds: number): { title: string; detail: string; progress: number } {
  const progress = Math.min(0.92, 1 - Math.exp(-Math.max(0, elapsedSeconds) / 25));
  if (elapsedSeconds < 15) {
    return { title: 'Reading your answers', detail: 'Your goal, level, diet and equipment shape the week.', progress };
  }
  if (elapsedSeconds < 40) {
    return { title: 'Planning 7 days', detail: 'Workouts, meals and habits, with a lighter day to recover.', progress };
  }
  return { title: 'Nearly there', detail: 'This can take up to a minute. You can stay on this screen.', progress };
}

// ---------------------------------------------------------------------------
// Controller: holds the state and runs the call. One instance for the app
// (src/features/plan/generator.ts), so Today and Plan share one run.
// ---------------------------------------------------------------------------

export type PlanGeneratorDeps<Plan> = {
  /** POST /plan/generate. Throws ApiError. */
  generate(): Promise<Plan>;
  /** 201: put the plan in the cache, refresh what depends on it. */
  onSuccess(plan: Plan): void | Promise<void>;
  /** 409 onboarding: open the onboarding flow. */
  onNeedsOnboarding(): void;
  /** The call failed in a way where the plan may exist anyway: refresh the plan queries. */
  onPlanMayExist(): void;
  /** Monotonic-enough clock in ms (injected in tests). */
  now?(): number;
};

export type PlanGenerator = {
  getState(): GenerateState;
  subscribe(listener: () => void): () => void;
  /** Start (or retry). Ignored while running or while a retry isn't allowed yet. */
  start(): Promise<void>;
  /** Clear a shown failure (e.g. leaving the screen). Ignored while running. */
  dismiss(): void;
  /** Forget everything, including a run in flight (sign out). */
  reset(): void;
};

export function createPlanGenerator<Plan>(deps: PlanGeneratorDeps<Plan>): PlanGenerator {
  const now = deps.now ?? Date.now;
  let state: GenerateState = { status: 'idle' };
  let runId = 0;
  const listeners = new Set<() => void>();

  const set = (next: GenerateState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async start() {
      const startedAt = now();
      if (!canStart(state, startedAt)) return;
      const afterConflict = state.status === 'failed' && state.failure.kind === 'justGenerated';
      const id = ++runId;
      set({ status: 'running', startedAt, afterConflict });

      let plan: Plan;
      try {
        plan = await deps.generate();
      } catch (error) {
        if (id !== runId) return; // reset while in flight
        const failure = describeGenerateFailure(error, afterConflict);
        if (failure.kind === 'onboarding') {
          set({ status: 'idle' });
          deps.onNeedsOnboarding();
          return;
        }
        if (failure.kind === 'sessionExpired') {
          // The API client already signed the user out; nothing to show here.
          set({ status: 'idle' });
          return;
        }
        if (failure.checkForPlan) deps.onPlanMayExist();
        set({ status: 'failed', failure, failedAt: now() });
        return;
      }

      if (id !== runId) return;
      try {
        await deps.onSuccess(plan);
      } finally {
        if (id === runId) set({ status: 'idle' });
      }
    },

    dismiss() {
      if (state.status === 'failed') set({ status: 'idle' });
    },

    reset() {
      runId += 1;
      if (state.status !== 'idle') set({ status: 'idle' });
    },
  };
}
