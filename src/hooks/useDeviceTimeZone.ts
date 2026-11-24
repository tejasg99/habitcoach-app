/**
 * src/hooks/useDeviceTimeZone.ts
 *
 * The phone's time zone (null if it cannot tell), re-read when the app returns
 * to the foreground: people change it in system settings or by travelling.
 * A store subscription, because React Compiler would cache a plain call.
 */

import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { detectDeviceTimeZone } from '@/lib/timezone';

function subscribe(onChange: () => void): () => void {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}

const read = () => detectDeviceTimeZone();

export function useDeviceTimeZone(): string | null {
  return useSyncExternalStore(subscribe, read, read);
}
