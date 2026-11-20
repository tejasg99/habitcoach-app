/**
 * src/features/plan/useGenerateFlow.ts
 *
 * React glue for the shared plan generator: the current state, a ticking
 * clock while something time-based is on screen (progress copy, retry
 * countdown), and the button's label and enabled state.
 *
 * A failure is cleared when the screen loses focus, so coming back to the tab
 * starts fresh instead of showing an old message.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { canStart, generatingCopy, secondsUntilRetry, type GenerateState } from './generate';
import { planGenerator, usePlanGenerator } from './generator';

export type GenerateFlow = {
  state: GenerateState;
  /** Seconds since the run started (0 when not running). */
  elapsedSeconds: number;
  progressCopy: ReturnType<typeof generatingCopy>;
  /** Primary button label for the current state. */
  buttonLabel: string;
  buttonDisabled: boolean;
  running: boolean;
  start: () => void;
};

/** `idleLabel`: what the button says before anything happened ("Generate my plan"). */
export function useGenerateFlow(idleLabel: string): GenerateFlow {
  const state = usePlanGenerator();
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second only while the copy or a countdown depends on time.
  const waiting = state.status === 'failed' && state.failure.retry.type === 'after';
  const ticking = state.status === 'running' || waiting;
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  // Leaving the screen clears a shown failure.
  useFocusEffect(useCallback(() => () => planGenerator.dismiss(), []));

  // `now` only updates on ticks, so right after a state change it can be older
  // than the change itself. Never let the clock read earlier than that moment.
  const since = state.status === 'running' ? state.startedAt : state.status === 'failed' ? state.failedAt : 0;
  const clock = Math.max(now, since);

  const elapsedSeconds = state.status === 'running' ? Math.floor((clock - state.startedAt) / 1000) : 0;
  const waitSeconds = secondsUntilRetry(state, clock);

  let buttonLabel = idleLabel;
  if (state.status === 'failed' && state.failure.retry.type !== 'none') {
    buttonLabel = waitSeconds > 0 ? `Try again in ${waitSeconds} s` : 'Try again';
  }

  return {
    state,
    elapsedSeconds,
    progressCopy: generatingCopy(elapsedSeconds),
    buttonLabel,
    buttonDisabled: !canStart(state, clock),
    running: state.status === 'running',
    start: () => void planGenerator.start(),
  };
}
