/**
 * src/features/plan/generator.ts
 *
 * The app's single plan generator (logic in generate.ts), wired to the real
 * API, the query cache and the session:
 *
 *  - 201: the returned plan becomes the cached week plan straight away, and
 *    Today and Progress are refetched (the new plan changes today's list and
 *    today's planned count). A success haptic confirms it.
 *  - 409 onboarding: the session switches to the onboarding phase, which the
 *    root layout turns into the onboarding screen.
 *  - Errors after which a plan may exist anyway: refetch the plan queries, so
 *    a plan that did arrive replaces the empty state by itself.
 *  - Sign out (or session expiry) resets it, dropping any run in flight.
 *
 * One instance for the whole app, so the Today and Plan tabs show the same
 * run and can never start two generations at once.
 */

import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';

import { apiClient } from '@/api/client';
import { unwrap } from '@/api/errors';
import { getSession, planBecameAvailable, sessionNeedsOnboarding, subscribeSession } from '@/features/auth/session';
import { queryClient } from '@/lib/queryClient';

import { createPlanGenerator, type GenerateState } from './generate';
import { planKeys, type WeekPlan } from './queries';

export const planGenerator = createPlanGenerator<WeekPlan>({
  generate: () => unwrap('generate_weekly_plan', apiClient.POST('/plan/generate')),

  async onSuccess(plan) {
    queryClient.setQueryData(planKeys.week, plan);
    planBecameAvailable();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    // Today's items come from the new plan now; progress counts today's planned
    // items from the active plan. ['progress'] is the prefix Milestone 6 uses.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: planKeys.today }),
      queryClient.invalidateQueries({ queryKey: ['progress'] }),
    ]);
  },

  onNeedsOnboarding: sessionNeedsOnboarding,

  onPlanMayExist() {
    void queryClient.invalidateQueries({ queryKey: planKeys.all });
  },
});

// Leaving the signed-in tabs (logout, expiry, onboarding) forgets the run.
subscribeSession(() => {
  if (getSession().phase !== 'ready') planGenerator.reset();
});

export function usePlanGenerator(): GenerateState {
  return useSyncExternalStore(planGenerator.subscribe, planGenerator.getState, planGenerator.getState);
}
