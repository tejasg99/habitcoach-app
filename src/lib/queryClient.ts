/**
 * src/lib/queryClient.ts
 *
 * The one TanStack Query client for the app, wired in the root layout.
 *
 * Defaults, and why:
 *  - retry: false. The API client already refreshes and retries a 401 once,
 *    and the brief asks for user-driven retries (retry buttons), not silent
 *    loops against a free-tier server that may be asleep.
 *  - staleTime 30 s. Tab switches within half a minute reuse the cache; screens
 *    refetch on focus after that (see src/hooks/useRefetchOnFocus.ts). No
 *    polling ("Do not poll aggressively").
 *  - No mutation retries either: plan generation must never be retried
 *    automatically (5 per day limit, and the server already retries).
 *
 * Query keys live next to the features that own them (e.g. planKeys in
 * src/features/plan/queries.ts). Everything is cleared on logout so the next
 * account never sees the previous one's data.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
