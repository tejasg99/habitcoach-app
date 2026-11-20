/**
 * src/app/(tabs)/plan.tsx
 *
 * Plan tab (the brief's Week view). PLACEHOLDER until Milestone 4.
 */

import { CalendarDays } from 'lucide-react-native';

import { TabPlaceholder } from '@/components/layout/TabPlaceholder';

export default function PlanScreen() {
  return (
    <TabPlaceholder
      title="Plan"
      icon={CalendarDays}
      emptyTitle="Your week goes here"
      emptyMessage="The 7-day plan view arrives in Milestone 4."
    />
  );
}
