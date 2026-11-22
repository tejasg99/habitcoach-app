/**
 * src/features/today/logging.ts
 *
 * Checking items off on Today: an optimistic TanStack Query mutation
 * (brief, "Logging is idempotent").
 *
 *  - Log:  POST /logs { plan_item_id }. 201 (created) and 200 (already logged)
 *          are both success; `unwrap` accepts any 2xx and both return the log.
 *  - Undo: DELETE /logs/{log_id}. Needs the `log_id` from the log response or
 *          from GET /plan/today.
 *
 * Flow for one tap:
 *  1. onMutate: the cached Today item flips at once (log: completed with no
 *     log_id yet; undo: not completed). The previous values are kept.
 *  2. onSuccess: the server's answer replaces the temporary state (log: the real
 *     log_id, which is what makes undo possible).
 *  3. onError: the item goes back to what it was and a short message is shown.
 *     404 / 409 (stale item, not today, only today's can be undone) also count
 *     here; Today is refetched afterwards anyway.
 *  4. onSettled: once no other log/undo is in flight, Today, Progress and the
 *     streak are invalidated. Waiting for the last one avoids a refetch landing
 *     in the middle of another item's optimistic state.
 *
 * Busy items: while an item has a log or undo in flight, further taps on it are
 * ignored. That is what makes repeated taps safe (the server would be fine with
 * a second POST, but a log racing an undo could end in the wrong state) and
 * what keeps undo disabled until the log request has resolved. "Busy" is read
 * from TanStack's mutation cache, which marks a mutation pending synchronously
 * when it starts, so two taps in the same frame still see each other.
 *
 * Everything takes the QueryClient and the API as arguments, so the tests run
 * the real mutation logic without React (src/__tests__/today-logging.test.ts).
 */

import { MutationObserver, type MutationOptions, type QueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { ERROR_COPY, isApiError, unwrap } from '@/api/errors';

import { planKeys, type TodayPlan } from '../plan/queries';
import { progressKeys } from '../progress/queries';
import { todaySummary, type TodayItem } from './checklist';

export const TODAY_LOG_MUTATION_KEY = ['today', 'log'] as const;

export type LogRead = Awaited<ReturnType<typeof createLogRequest>>;

export type LogApi = {
  createLog: (planItemId: number) => Promise<LogRead>;
  removeLog: (logId: number) => Promise<void>;
};

export type LogEffects = {
  /** Called right after an item is optimistically marked done (haptics). */
  onCompleted?: (allDoneNow: boolean) => void;
  /** A short message for the person (toast). */
  onNotice?: (message: string) => void;
};

export type TodayLogVariables = { kind: 'log'; itemId: number } | { kind: 'undo'; itemId: number; logId: number };

type ItemSnapshot = Pick<TodayItem, 'completed' | 'log_id'>;
type TodayLogContext = { previous: ItemSnapshot | null };

// ---------------------------------------------------------------------------
// The real API calls
// ---------------------------------------------------------------------------

function createLogRequest(planItemId: number) {
  // No value, no date: the server decides "today" (brief, "Do not").
  return unwrap('create_log', apiClient.POST('/logs', { body: { plan_item_id: planItemId } }));
}

export const liveLogApi: LogApi = {
  createLog: createLogRequest,
  async removeLog(logId) {
    await unwrap('remove_log', apiClient.DELETE('/logs/{log_id}', { params: { path: { log_id: logId } } }));
  },
};

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function readItem(queryClient: QueryClient, itemId: number): TodayItem | undefined {
  return queryClient.getQueryData<TodayPlan>(planKeys.today)?.items.find((item) => item.id === itemId);
}

function patchItem(queryClient: QueryClient, itemId: number, patch: ItemSnapshot): void {
  queryClient.setQueryData<TodayPlan>(planKeys.today, (old) =>
    old ? { ...old, items: old.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) } : old,
  );
}

/** True while this item has a log or undo request in flight. */
export function isTodayItemBusy(queryClient: QueryClient, itemId: number): boolean {
  return queryClient
    .getMutationCache()
    .findAll({ mutationKey: TODAY_LOG_MUTATION_KEY, status: 'pending' })
    .some((mutation) => (mutation.state.variables as TodayLogVariables | undefined)?.itemId === itemId);
}

/** Undo is offered only for a done item whose log id is known and not in flight. */
export function canUndo(item: ItemSnapshot, busy: boolean): boolean {
  return item.completed && item.log_id != null && !busy;
}

// ---------------------------------------------------------------------------
// The mutation
// ---------------------------------------------------------------------------

export function todayLogMutationOptions(
  queryClient: QueryClient,
  api: LogApi,
  effects: LogEffects = {},
): MutationOptions<LogRead | null, unknown, TodayLogVariables, TodayLogContext> {
  return {
    mutationKey: TODAY_LOG_MUTATION_KEY,

    mutationFn: async (vars) => {
      if (vars.kind === 'log') return api.createLog(vars.itemId);
      await api.removeLog(vars.logId);
      return null;
    },

    async onMutate(vars) {
      // A Today fetch already on the way would overwrite the optimistic state.
      await queryClient.cancelQueries({ queryKey: planKeys.today });
      const current = readItem(queryClient, vars.itemId);
      const previous = current ? { completed: current.completed, log_id: current.log_id ?? null } : null;

      if (vars.kind === 'log') {
        patchItem(queryClient, vars.itemId, { completed: true, log_id: null });
        const items = queryClient.getQueryData<TodayPlan>(planKeys.today)?.items ?? [];
        effects.onCompleted?.(todaySummary(items).allDone);
      } else {
        patchItem(queryClient, vars.itemId, { completed: false, log_id: null });
      }
      return { previous };
    },

    onSuccess(log, vars) {
      if (vars.kind === 'log' && log) patchItem(queryClient, vars.itemId, { completed: true, log_id: log.id });
    },

    onError(error, vars, context) {
      if (context?.previous) patchItem(queryClient, vars.itemId, context.previous);
      effects.onNotice?.(isApiError(error) ? error.message : ERROR_COPY.unexpected);
    },

    onSettled() {
      // This mutation still counts as pending here, so 1 means "only me".
      if (queryClient.isMutating({ mutationKey: TODAY_LOG_MUTATION_KEY }) > 1) return;
      void queryClient.invalidateQueries({ queryKey: planKeys.today });
      void queryClient.invalidateQueries({ queryKey: progressKeys.all });
    },
  };
}

/**
 * One tap on a Today row. Reads the item from the cache (not from a possibly
 * stale prop), ignores the tap while the item is busy, then logs or undoes.
 */
export function toggleTodayItem(
  queryClient: QueryClient,
  options: ReturnType<typeof todayLogMutationOptions>,
  itemId: number,
): 'log' | 'undo' | 'ignored' {
  const item = readItem(queryClient, itemId);
  if (!item || isTodayItemBusy(queryClient, itemId)) return 'ignored';

  let vars: TodayLogVariables;
  if (!item.completed) vars = { kind: 'log', itemId };
  else if (item.log_id != null) vars = { kind: 'undo', itemId, logId: item.log_id };
  else return 'ignored';

  // MutationObserver is the primitive `useMutation` wraps. Errors are handled
  // in onError, so the returned promise is only silenced here.
  new MutationObserver(queryClient, options).mutate(vars).catch(() => undefined);
  return vars.kind;
}
