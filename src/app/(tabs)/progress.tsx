/**
 * src/app/(tabs)/progress.tsx
 *
 * Progress tab. PLACEHOLDER until Milestone 6.
 */

import { ChartNoAxesColumn } from 'lucide-react-native';

import { TabPlaceholder } from '@/components/layout/TabPlaceholder';

export default function ProgressScreen() {
  return (
    <TabPlaceholder
      title="Progress"
      icon={ChartNoAxesColumn}
      emptyTitle="Your streak and history go here"
      emptyMessage="Charts and streaks arrive in Milestone 6."
    />
  );
}
