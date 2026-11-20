/**
 * src/app/(tabs)/index.tsx
 *
 * Today tab. PLACEHOLDER until Milestone 5. It already reflects the startup
 * gate's /plan/today check: with no active plan (404) it shows the
 * "Generate my plan" empty state (the action itself arrives in Milestone 4).
 */

import { Sparkles, Sun } from 'lucide-react-native';

import { TabPlaceholder } from '@/components/layout/TabPlaceholder';
import { Button } from '@/components/ui';
import { useSession } from '@/features/auth/session';

export default function TodayScreen() {
  const { hasPlan } = useSession();

  if (hasPlan === false) {
    return (
      <TabPlaceholder
        title="Today"
        icon={Sparkles}
        emptyTitle="No plan yet"
        emptyMessage="Your 7-day plan is built from your answers. Plan generation arrives in Milestone 4."
        action={<Button label="Generate my plan" size="lg" fullWidth disabled />}
      />
    );
  }

  return (
    <TabPlaceholder
      title="Today"
      icon={Sun}
      emptyTitle="Your checklist goes here"
      emptyMessage="Today's workouts, meals and habits arrive in Milestone 5."
    />
  );
}
