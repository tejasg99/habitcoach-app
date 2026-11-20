/**
 * src/app/starting.tsx
 *
 * The startup gate's own screen. Available only while the session phase is
 * 'booting', 'checking' or 'error' (see _layout.tsx):
 *
 *  - booting / checking: a quiet holding screen (app name + one line). The
 *    "Waking up the server..." toast appears on top if the API is slow.
 *  - error: a danger card in plain language with "Try again" and "Log out"
 *    (the user stays logged in on network errors, but must never be stuck),
 *    plus "Copy debug info". This Log out is NOT dev-only: it is the way out
 *    of an account that cannot be loaded.
 */

import { View } from 'react-native';

import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { Button, Screen, Text } from '@/components/ui';
import { retrySession, signOut, useSession } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

export default function StartingScreen() {
  const { phase, error } = useSession();

  const styles = useThemedStyles((t) => ({
    // Content centred vertically: there is nothing else on this screen.
    content: { justifyContent: 'center' },
    // Holding state: name and line, centred, small gap between them.
    centre: { alignItems: 'center' },
    name: { marginBottom: t.spacing[8] },
    // Small, muted request reference under the error card.
    reference: { marginTop: t.spacing[12] },
    // The copy action sits under the reference, left-aligned with it.
    copy: { marginTop: t.spacing[8], alignSelf: 'flex-start' },
  }));

  if (phase === 'error' && error) {
    return (
      <Screen contentStyle={styles.content}>
        <Notice title="We couldn't load your account" message={error.message}>
          <Button label="Try again" variant="primary" onPress={() => void retrySession()} />
          <Button label="Log out" variant="ghost" size="sm" onPress={() => void signOut()} />
        </Notice>
        {error.requestId ? (
          <Text variant="caption" color="textSecondary" selectable style={styles.reference}>
            Reference {error.requestId}
          </Text>
        ) : null}
        <CopyDebugInfo style={styles.copy} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.centre} accessibilityLiveRegion="polite">
        <Text variant="title2" style={styles.name}>
          Habit coach
        </Text>
        <Text variant="callout" color="textSecondary">
          Getting your day ready
        </Text>
      </View>
    </Screen>
  );
}
