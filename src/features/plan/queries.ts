/**
 * src/features/plan/queries.ts
 *
 * Query keys and hooks for the active plan:
 *   planKeys.today  GET /plan/today  (TodayRead: server-decided weekday + items)
 *   planKeys.week   GET /plan/week   (PlanRead: every item of the active plan)
 *
 * A 404 on either means "no active plan" and surfaces as an ApiError with
 * action 'generatePlan' (src/api/errors.ts); screens check `isNoPlan(error)`.
 */

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { isApiError, unwrap } from '@/api/errors';

export const planKeys = {
  all: ['plan'] as const,
  today: ['plan', 'today'] as const,
  week: ['plan', 'week'] as const,
};

export const fetchTodayPlan = () => unwrap('get_today_plan', apiClient.GET('/plan/today'));
export const fetchWeekPlan = () => unwrap('get_week_plan', apiClient.GET('/plan/week'));

export type TodayPlan = Awaited<ReturnType<typeof fetchTodayPlan>>;
export type WeekPlan = Awaited<ReturnType<typeof fetchWeekPlan>>;
export type PlanItem = WeekPlan['items'][number];
export type PlanItemType = PlanItem['type'];

export function useTodayPlan() {
  return useQuery({ queryKey: planKeys.today, queryFn: fetchTodayPlan });
}

export function useWeekPlan() {
  return useQuery({ queryKey: planKeys.week, queryFn: fetchWeekPlan });
}

/** True when the error is the "no active plan" 404. */
export function isNoPlan(error: unknown): boolean {
  return isApiError(error) && error.action === 'generatePlan';
}
