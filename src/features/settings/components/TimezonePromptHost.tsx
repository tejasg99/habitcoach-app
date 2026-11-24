/**
 * src/features/settings/components/TimezonePromptHost.tsx
 *
 * Runs the time zone check when the tabs open (app launch, login) and each
 * time the app returns to the foreground, and shows the sheet if there is
 * something to offer. The rules are in timezonePrompt.ts.
 *
 * Uses the cached account and profile (the startup gate just loaded them), so
 * coming back to the app sends no extra requests.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getTimezoneAnswer } from '@/lib/storage';
import { detectDeviceTimeZone } from '@/lib/timezone';

import { fetchMe, fetchProfile, settingsKeys } from '../queries';
import { checkTimezone, type TimezoneOffer } from '../timezonePrompt';
import { TimezoneSheet } from './TimezoneSheet';

export function TimezonePromptHost() {
  const client = useQueryClient();
  const [offer, setOffer] = useState<TimezoneOffer | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const next = await checkTimezone({
        device: detectDeviceTimeZone,
        me: () => client.ensureQueryData({ queryKey: settingsKeys.me, queryFn: fetchMe }),
        profile: () => client.ensureQueryData({ queryKey: settingsKeys.profile, queryFn: fetchProfile }),
        readAnswer: getTimezoneAnswer,
      });
      // Keep a sheet that is already open; never replace it under the person.
      if (active && next) setOffer((open) => open ?? next);
    };
    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [client]);

  return <TimezoneSheet offer={offer} onClose={() => setOffer(null)} />;
}
