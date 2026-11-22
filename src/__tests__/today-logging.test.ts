/**
 * Optimistic log / undo on Today (src/features/today/logging.ts), run through
 * a real TanStack QueryClient with a fake API whose requests we resolve or
 * reject by hand, so every in-between state can be checked.
 */

import { QueryClient } from '@tanstack/react-query';

import { ERROR_COPY, mapApiError, unwrap, type ApiOperation } from '@/api/errors';
import { planKeys, type TodayPlan } from '@/features/plan/queries';
import { progressKeys } from '@/features/progress/queries';
import {
  canUndo,
  isTodayItemBusy,
  todayLogMutationOptions,
  toggleTodayItem,
  type LogApi,
  type LogRead,
} from '@/features/today/logging';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Let pending promise callbacks (onMutate, onSuccess, ...) run. */
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function httpError(operation: ApiOperation, status: number) {
  return mapApiError({ operation, status, body: { detail: 'x' }, headers: new Headers() });
}

const networkError = (operation: ApiOperation) => mapApiError({ operation, cause: new TypeError('Network request failed') });

function log(id: number, planItemId: number): LogRead {
  return { id, plan_item_id: planItemId, log_date: '2026-11-22', completed_at: '2026-11-22T08:00:00Z', value: null };
}

function todayPlan(items: { id: number; completed?: boolean; log_id?: number | null }[]): TodayPlan {
  return {
    plan_id: 1,
    local_date: '2026-11-22',
    weekday: 6,
    items: items.map((it, i) => ({
      id: it.id,
      day_of_week: 6,
      position: i,
      type: 'habit',
      title: `Item ${it.id}`,
      description: '',
      target_metric: null,
      completed: it.completed ?? false,
      log_id: it.log_id ?? null,
    })),
  };
}

function setup(items: Parameters<typeof todayPlan>[0]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(planKeys.today, todayPlan(items));

  const createCalls: Deferred<LogRead>[] = [];
  const removeCalls: Deferred<void>[] = [];
  const api: LogApi = {
    createLog: jest.fn(() => {
      const d = deferred<LogRead>();
      createCalls.push(d);
      return d.promise;
    }),
    removeLog: jest.fn(() => {
      const d = deferred<void>();
      removeCalls.push(d);
      return d.promise;
    }),
  };
  const onNotice = jest.fn();
  const onCompleted = jest.fn();
  const options = todayLogMutationOptions(queryClient, api, { onNotice, onCompleted });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

  const item = (id: number) => queryClient.getQueryData<TodayPlan>(planKeys.today)!.items.find((i) => i.id === id)!;
  const tap = (id: number) => toggleTodayItem(queryClient, options, id);
  const busy = (id: number) => isTodayItemBusy(queryClient, id);

  return { queryClient, api, createCalls, removeCalls, onNotice, onCompleted, invalidate, item, tap, busy };
}

function invalidatedKeys(invalidate: jest.SpyInstance) {
  return invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey);
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

describe('optimistic log', () => {
  it('marks the item done at once, then stores the server log id', async () => {
    const t = setup([{ id: 10 }, { id: 11 }]);

    expect(t.tap(10)).toBe('log');
    await flush();

    // Temporary state: done, no log id yet, busy.
    expect(t.item(10)).toMatchObject({ completed: true, log_id: null });
    expect(t.busy(10)).toBe(true);
    expect(t.api.createLog).toHaveBeenCalledWith(10);
    expect(t.onCompleted).toHaveBeenCalledWith(false); // one of two done: light haptic

    t.createCalls[0]!.resolve(log(77, 10));
    await flush();

    expect(t.item(10)).toMatchObject({ completed: true, log_id: 77 });
    expect(t.busy(10)).toBe(false);
    expect(t.onNotice).not.toHaveBeenCalled();
    expect(invalidatedKeys(t.invalidate)).toEqual([planKeys.today, progressKeys.all]);
  });

  it('reports "all done" when the last item is checked (success haptic)', async () => {
    const t = setup([{ id: 10, completed: true, log_id: 5 }, { id: 11 }]);
    t.tap(11);
    await flush();
    expect(t.onCompleted).toHaveBeenCalledWith(true);
  });

  it('reverts and shows a message when the request fails', async () => {
    const t = setup([{ id: 10 }]);
    t.tap(10);
    await flush();
    expect(t.item(10).completed).toBe(true);

    t.createCalls[0]!.reject(networkError('create_log'));
    await flush();

    expect(t.item(10)).toMatchObject({ completed: false, log_id: null });
    expect(t.busy(10)).toBe(false);
    expect(t.onNotice).toHaveBeenCalledWith(ERROR_COPY.network);
    expect(invalidatedKeys(t.invalidate)).toContainEqual(planKeys.today);
  });

  it.each([404, 409])('%i on log: reverts, refreshes Today, short message', async (status) => {
    const t = setup([{ id: 10 }]);
    t.tap(10);
    await flush();
    t.createCalls[0]!.reject(httpError('create_log', status));
    await flush();

    expect(t.item(10).completed).toBe(false);
    expect(t.onNotice).toHaveBeenCalledWith(ERROR_COPY.staleItem);
    expect(invalidatedKeys(t.invalidate)).toEqual([planKeys.today, progressKeys.all]);
  });

  it('treats 200 "already logged" exactly like 201 (both unwrap to the log)', async () => {
    const body = log(77, 10);
    for (const status of [200, 201]) {
      const response = new Response(JSON.stringify(body), { status });
      await expect(unwrap('create_log', Promise.resolve({ data: body, response }))).resolves.toEqual(body);
    }
  });
});

// ---------------------------------------------------------------------------
// Repeated taps and undo while pending
// ---------------------------------------------------------------------------

describe('busy items', () => {
  it('undo is disabled until the log request has resolved', async () => {
    const t = setup([{ id: 10 }]);
    t.tap(10);
    await flush();

    expect(canUndo(t.item(10), t.busy(10))).toBe(false);
    expect(t.tap(10)).toBe('ignored'); // a tap on the now-done row does not undo
    expect(t.api.removeLog).not.toHaveBeenCalled();

    t.createCalls[0]!.resolve(log(77, 10));
    await flush();
    expect(canUndo(t.item(10), t.busy(10))).toBe(true);
  });

  it('repeated taps send one request and never error', async () => {
    const t = setup([{ id: 10 }]);
    const results = [t.tap(10), t.tap(10), t.tap(10), t.tap(10)];
    await flush();

    expect(results).toEqual(['log', 'ignored', 'ignored', 'ignored']);
    expect(t.api.createLog).toHaveBeenCalledTimes(1);

    t.createCalls[0]!.resolve(log(77, 10));
    await flush();
    expect(t.onNotice).not.toHaveBeenCalled();
    expect(t.item(10)).toMatchObject({ completed: true, log_id: 77 });
  });

  it('a done item without a log id cannot be undone', () => {
    const t = setup([{ id: 10, completed: true, log_id: null }]);
    expect(canUndo(t.item(10), false)).toBe(false);
    expect(t.tap(10)).toBe('ignored');
  });

  it('other items stay tappable, and Today is refreshed only after the last request', async () => {
    const t = setup([{ id: 10 }, { id: 11 }]);
    t.tap(10);
    t.tap(11);
    await flush();
    expect(t.api.createLog).toHaveBeenCalledTimes(2);

    t.createCalls[0]!.resolve(log(1, 10));
    await flush();
    expect(t.invalidate).not.toHaveBeenCalled();
    expect(t.item(11)).toMatchObject({ completed: true, log_id: null }); // untouched

    t.createCalls[1]!.resolve(log(2, 11));
    await flush();
    expect(invalidatedKeys(t.invalidate)).toEqual([planKeys.today, progressKeys.all]);
  });
});

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

describe('undo', () => {
  it('uses the log id and clears the item at once', async () => {
    const t = setup([{ id: 10, completed: true, log_id: 77 }]);
    expect(t.tap(10)).toBe('undo');
    await flush();

    expect(t.api.removeLog).toHaveBeenCalledWith(77);
    expect(t.item(10)).toMatchObject({ completed: false, log_id: null });
    expect(t.onCompleted).not.toHaveBeenCalled();

    t.removeCalls[0]!.resolve();
    await flush();
    expect(t.item(10)).toMatchObject({ completed: false, log_id: null });
    expect(invalidatedKeys(t.invalidate)).toEqual([planKeys.today, progressKeys.all]);
  });

  it('409 (only today can be undone): restores the check, message, refresh', async () => {
    const t = setup([{ id: 10, completed: true, log_id: 77 }]);
    t.tap(10);
    await flush();
    t.removeCalls[0]!.reject(httpError('remove_log', 409));
    await flush();

    expect(t.item(10)).toMatchObject({ completed: true, log_id: 77 });
    expect(t.onNotice).toHaveBeenCalledWith(ERROR_COPY.undoOnlyToday);
    expect(invalidatedKeys(t.invalidate)).toContainEqual(planKeys.today);
  });

  it('404 (log gone): message and refresh', async () => {
    const t = setup([{ id: 10, completed: true, log_id: 77 }]);
    t.tap(10);
    await flush();
    t.removeCalls[0]!.reject(httpError('remove_log', 404));
    await flush();

    expect(t.onNotice).toHaveBeenCalledWith(ERROR_COPY.staleItem);
    expect(invalidatedKeys(t.invalidate)).toContainEqual(planKeys.today);
  });
});
