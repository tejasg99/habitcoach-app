/**
 * src/components/layout/EmptyState.tsx
 *
 * Empty state from design doc 6: a simple icon in an `accentSoft` circle, a
 * `title3` line, one `callout` line, and at most one call to action (passed
 * as children). Used by the placeholder screens in Milestone 2 and by real
 * empty states later.
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, message, children }: EmptyStateProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Content centred in a column; left/right space comes from the Screen.
    root: { alignItems: 'center', paddingVertical: t.spacing[40] },
    // 64 px soft accent circle holding a 24 px icon.
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing[20],
    },
    // Title and message: centred, small gap between them.
    title: { textAlign: 'center', marginBottom: t.spacing[8] },
    message: { textAlign: 'center' },
    // The action sits clearly apart from the text.
    action: { marginTop: t.spacing[24], alignSelf: 'stretch' },
  }));

  return (
    <View style={styles.root}>
      <View style={styles.iconCircle}>
        <Icon size={24} strokeWidth={1.75} color={colors.accent} />
      </View>
      <Text variant="title3" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text variant="callout" color="textSecondary" style={styles.message}>
        {message}
      </Text>
      {children ? <View style={styles.action}>{children}</View> : null}
    </View>
  );
}
