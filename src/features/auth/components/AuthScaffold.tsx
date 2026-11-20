/**
 * src/features/auth/components/AuthScaffold.tsx
 *
 * Shared frame for the login and signup screens (design doc 7, Auth: soft
 * `bg`, large `title1`, filled inputs, one primary button, no gradient).
 *
 *   [back]
 *   Title (title1)
 *   Subtitle (callout, secondary)
 *   ...form (children)...
 *   footer (pinned to the bottom of the scroll content)
 *
 * The keyboard pushes the content up (KeyboardAvoidingView) and the content
 * scrolls, so the primary button stays reachable on small phones and at
 * large font sizes.
 */

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { IconButton, Screen, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

export type AuthScaffoldProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScaffold({ title, subtitle, children, footer }: AuthScaffoldProps) {
  const router = useRouter();

  const styles = useThemedStyles((t) => ({
    // Fills the screen so the keyboard can shrink it.
    flex: { flex: 1 },
    // Scroll content grows to at least the screen height, so the footer can
    // sit at the bottom on tall screens. (No padding here: Screen already
    // pads for the safe areas, and a padding here would replace it.)
    content: { flexGrow: 1 },
    // Back button row: a little air under the status bar, then a section gap
    // before the title.
    back: { alignSelf: 'flex-start', marginTop: t.spacing[8], marginBottom: t.spacing[32] },
    // Title block: small gap to the subtitle, a section gap to the form.
    title: { marginBottom: t.spacing[8] },
    header: { marginBottom: t.spacing[32] },
    // Form fields stacked with 20 px between them (inside a group: smaller
    // than the 32 px between sections).
    form: { gap: t.spacing[20] },
    // Pushes the footer to the bottom when there is spare height.
    spacer: { flex: 1, minHeight: t.spacing[32] },
    // Footer row: prompt text and a ghost button, centred.
    footer: { alignItems: 'center', marginBottom: t.spacing[16] },
  }));

  return (
    // 'padding' on both platforms: Android is edge-to-edge, where the window
    // no longer resizes for the keyboard by itself.
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen scroll contentStyle={styles.content}>
        <View style={styles.back}>
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
          />
        </View>
        <View style={styles.header}>
          <Text variant="title1" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" color="textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.form}>{children}</View>
        {footer ? (
          <>
            <View style={styles.spacer} />
            <View style={styles.footer}>{footer}</View>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
