/**
 * src/hooks/useRefetchOnFocus.ts
 *
 * Refetch a screen's data when the screen comes back into focus (switching
 * tabs, returning from another screen). The first focus is skipped because
 * the query already loads on mount. Stale-time rules still apply inside the
 * passed function if it uses `refetch` on a fresh query; that is cheap.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useRefetchOnFocus(refetch: () => unknown): void {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );
}
