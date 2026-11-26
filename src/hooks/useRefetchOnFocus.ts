/**
 * src/hooks/useRefetchOnFocus.ts
 *
 * Refetch a screen's data when the screen comes back into focus (switching
 * tabs, returning from another screen), and when the app returns to the
 * foreground while this screen is the one showing. The second case matters
 * for Today: a phone left overnight must not keep showing yesterday's list
 * (the server decides what "today" is). Both are events, not polling.
 *
 * The first focus is skipped because the query already loads on mount.
 * Stale-time rules still apply inside the passed function if it uses
 * `refetch` on a fresh query; that is cheap.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

export function useRefetchOnFocus(refetch: () => unknown): void {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
      } else {
        void refetch();
      }

      // While focused: refetch each time the app comes back to the foreground.
      // The listener is removed when the screen loses focus.
      // currentState can be unknown (null) right at launch; treat that as "not active".
      let previous: string | null | undefined = AppState.currentState;
      const subscription = AppState.addEventListener('change', (next) => {
        if (previous !== 'active' && next === 'active') void refetch();
        previous = next;
      });
      return () => subscription.remove();
    }, [refetch]),
  );
}
