/**
 * src/components/layout/Notice.tsx
 *
 * An inline message block, built from theme tokens only.
 *
 *   tone="danger"   error card (design doc 6, "Error: danger soft card with a
 *                   retry action, written in plain language")
 *   tone="neutral"  informational message. The doc has no info blue on
 *                   purpose: neutral info is `surfaceMuted` + `textSecondary`.
 *
 * Always icon + text, so meaning never relies on colour alone. Optional
 * `title` and action buttons (passed as children) sit under the message.
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import { CircleAlert, Info } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export type NoticeProps = {
  message: string;
  title?: string;
  tone?: 'danger' | 'neutral';
  /** Optional actions (Buttons), shown under the text. */
  children?: ReactNode;
};

export function Notice({ message, title, tone = 'danger', children }: NoticeProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // The block: a tinted flat surface with card-like corners. No border, no
    // shadow (it sits inside a screen, not floating above it).
    box: {
      borderRadius: t.radius.md,
      padding: t.layout.cardPaddingCompact,
    },
    danger: { backgroundColor: t.colors.dangerSoft },
    neutral: { backgroundColor: t.colors.surfaceMuted },
    // Icon in its own column next to the text, aligned to the first line.
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    // 2 px nudge lines a 20 px icon up with the 24 px first line of body text.
    icon: { marginRight: t.spacing[12], marginTop: 2 },
    // The text column takes the remaining width so long messages wrap.
    textColumn: { flex: 1 },
    // Small gap between title and message.
    title: { marginBottom: t.spacing[4] },
    // Actions get clear space above them, and space between each other.
    actions: { marginTop: t.spacing[16], gap: t.spacing[8], alignItems: 'flex-start' },
  }));

  const Icon = tone === 'danger' ? CircleAlert : Info;
  const ink = tone === 'danger' ? 'dangerText' : 'textSecondary';

  return (
    <View
      style={[styles.box, tone === 'danger' ? styles.danger : styles.neutral]}
      // Screen readers announce the message when it appears.
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Icon size={20} strokeWidth={1.75} color={colors[ink]} style={styles.icon} />
        <View style={styles.textColumn}>
          {title ? (
            <Text variant="bodyStrong" color={tone === 'danger' ? 'dangerText' : 'textPrimary'} style={styles.title}>
              {title}
            </Text>
          ) : null}
          <Text variant="callout" color={ink}>
            {message}
          </Text>
        </View>
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}
