/**
 * src/app/(tabs)/index.tsx
 *
 * Today tab. The checklist itself arrives in Milestone 5. Since Milestone 4 it
 * reads GET /plan/today through the query cache (primed by the startup gate):
 *
 *  - 404 (no active plan): the "Generate my plan" empty state and flow
 *  - other errors: a retry notice
 *  - a plan: the placeholder until Milestone 5
 */

import { Sun } from 'lucide-react-native';
import { View } from 'react-native';

import { isApiError } from '@/api/errors';
import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { TAB_BAR_CLEARANCE, TabPlaceholder } from '@/components/layout/TabPlaceholder';
import { Button, Screen, Text } from '@/components/ui';
import { GeneratePlanEmptyState } from '@/features/plan/components/GeneratePlanEmptyState';
import { isNoPlan, useTodayPlan } from '@/features/plan/queries';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useThemedStyles } from '@/theme';

export default function TodayScreen() {
  const today = useTodayPlan();
  useRefetchOnFocus(today.refetch);

  const styles = useThemedStyles((t) => ({
    // Screen title with air under the status bar, like every top-level screen.
    title: { marginTop: t.spacing[24] },
    // Space between the title and the content below it.
    body: { marginTop: t.spacing[24] },
  }));

  if (today.error) {
    const error = today.error;
    return (
      <Screen scroll bottomSpace={TAB_BAR_CLEARANCE}>
        <Text variant="title1" accessibilityRole="header" style={styles.title}>
          Today
        </Text>
        <View style={styles.body}>
          {isNoPlan(error) ? (
            <GeneratePlanEmptyState />
          ) : (
            <Notice message={isApiError(error) ? error.message : "We couldn't load today. Try again."}>
              <Button
                label="Try again"
                variant="secondary"
                size="sm"
                loading={today.isFetching}
                onPress={() => void today.refetch()}
              />
              {isApiError(error) && (error.status ?? 0) >= 500 ? <CopyDebugInfo /> : null}
            </Notice>
          )}
        </View>
      </Screen>
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
