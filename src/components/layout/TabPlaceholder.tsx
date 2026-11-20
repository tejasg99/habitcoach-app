/**
 * src/components/layout/TabPlaceholder.tsx
 *
 * Temporary body for the tab screens until their milestones land: the
 * screen title (`title1`) and an empty state. `children` go below (e.g. the
 * dev actions on Settings).
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import { EmptyState } from './EmptyState';

/**
 * Space kept free under scrolling tab content so the last item can scroll
 * clear of the floating tab bar: bar height (8 + 32 + 4 + 14 + 8 = 66) +
 * its 12 px gap above the safe area + 16 px of air, rounded up to the 4 pt grid.
 */
export const TAB_BAR_CLEARANCE = 96;

export type TabPlaceholderProps = {
  title: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyMessage: string;
  /** Call to action inside the empty state. */
  action?: ReactNode;
  /** Extra content below the empty state. */
  children?: ReactNode;
};

export function TabPlaceholder({ title, icon, emptyTitle, emptyMessage, action, children }: TabPlaceholderProps) {
  const styles = useThemedStyles((t) => ({
    // Screen title with air under the status bar, like every top-level screen.
    title: { marginTop: t.spacing[24] },
  }));

  return (
    <Screen scroll bottomSpace={TAB_BAR_CLEARANCE}>
      <Text variant="title1" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <EmptyState icon={icon} title={emptyTitle} message={emptyMessage}>
        {action}
      </EmptyState>
      {children}
    </Screen>
  );
}
