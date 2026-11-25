/**
 * src/app/(tabs)/settings.tsx
 *
 * Settings tab (Milestone 7): grouped `surface` cards (design doc 7).
 *
 *   Appearance   mode and accent, stored on the device only
 *   Reminders    switch, time, time zone (PATCH /onboarding/me, one field each)
 *   Account      email, display name, log out, delete account
 *   Support      version, platform, latest request id, Copy debug info
 *   (dev builds) link to the design gallery, copy the push token for testing
 *
 * Appearance, log out and support never wait for the server. Reminders and the
 * account details show a skeleton while loading and a notice with Try again if
 * they could not be loaded. Refreshes on focus; no polling.
 */

import * as Clipboard from 'expo-clipboard';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { isApiError } from '@/api/errors';
import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { TAB_BAR_CLEARANCE } from '@/components/layout/TabPlaceholder';
import { Button, Card, Screen, Skeleton, Text } from '@/components/ui';
import { AccountCard } from '@/features/settings/components/AccountCard';
import { AppearanceCard } from '@/features/settings/components/AppearanceCard';
import { RemindersCard } from '@/features/settings/components/RemindersCard';
import { SupportCard } from '@/features/settings/components/SupportCard';
import { useMe, useProfile } from '@/features/settings/queries';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { getPushToken } from '@/lib/storage';
import { useThemedStyles } from '@/theme';

// The gallery route only exists in dev; cast once so typed routes stay quiet
// if the generated route types are stale.
const GALLERY_HREF = '/gallery' as Href;

export default function SettingsScreen() {
  const router = useRouter();
  const me = useMe();
  const profile = useProfile();

  const refetchMe = me.refetch;
  const refetchProfile = profile.refetch;
  const refetch = useCallback(() => Promise.all([refetchMe(), refetchProfile()]), [refetchMe, refetchProfile]);
  useRefetchOnFocus(refetch);

  const styles = useThemedStyles((t) => ({
    // Screen title with air under the status bar, like every top-level screen.
    title: { marginTop: t.spacing[24], marginBottom: t.spacing[24] },
    // The cards, one under the other at the standard card gap.
    cards: { gap: t.layout.cardGap },
    // Skeleton rows sit where the real rows will be, 16 apart.
    skeleton: { gap: t.spacing[16] },
  }));

  // Either read failing with nothing cached: say so once, with one retry.
  const failed = (!me.data && me.error) || (!profile.data && profile.error) || null;
  const loadingProfile = !profile.data && !profile.error;

  return (
    <Screen scroll bottomSpace={TAB_BAR_CLEARANCE}>
      <Text variant="title1" accessibilityRole="header" style={styles.title}>
        Settings
      </Text>
      <View style={styles.cards}>
        <AppearanceCard />

        {failed ? (
          <Notice
            message={isApiError(failed) ? failed.message : "We couldn't load your settings. Try again."}
          >
            <Button
              label="Try again"
              variant="secondary"
              size="sm"
              loading={me.isFetching || profile.isFetching}
              onPress={() => void refetch()}
            />
            {isApiError(failed) && (failed.status ?? 0) >= 500 ? <CopyDebugInfo /> : null}
          </Notice>
        ) : null}

        {profile.data ? (
          <RemindersCard profile={profile.data} userId={me.data?.id} />
        ) : loadingProfile ? (
          <Card style={styles.skeleton}>
            <Skeleton width="40%" height={24} />
            <Skeleton height={52} />
            <Skeleton height={52} />
          </Card>
        ) : null}

        <AccountCard me={me.data} />
        <SupportCard />

        {__DEV__ ? (
          <>
            <Button
              label="Open design gallery"
              variant="ghost"
              fullWidth
              onPress={() => router.push(GALLERY_HREF)}
            />
            <CopyPushToken />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

/** Development builds only: puts the push token on the clipboard, for docs/PUSH_TESTING.md. Never shown or logged. */
function CopyPushToken() {
  const [label, setLabel] = useState('Copy push token');
  const copy = async () => {
    const token = await getPushToken().catch(() => null);
    if (token) await Clipboard.setStringAsync(token);
    setLabel(token ? 'Push token copied' : 'No push token yet');
  };
  return <Button label={label} variant="ghost" fullWidth onPress={() => void copy()} />;
}
