/**
 * src/features/plan/components/GeneratePlanEmptyState.tsx
 *
 * The "Generate my plan" empty state, shown by Today and Plan when
 * /plan/today or /plan/week answers 404 (no active plan).
 *
 * Layout, top to bottom (design doc 6, "Empty"): icon in an accentSoft circle,
 * a title3 line, one callout line, ONE primary button; then the run's status
 * (progress card or error notice) and the wellness disclaimer.
 *
 * The button is disabled while a plan is being built and while a retry has to
 * wait; it is never pressed for the user (no automatic retries).
 */

import { CalendarPlus } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { Button } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import { useGenerateFlow } from '../useGenerateFlow';
import { GenerationStatus } from './GenerationStatus';
import { WellnessNote } from './WellnessNote';

export function GeneratePlanEmptyState() {
  const flow = useGenerateFlow('Generate my plan');

  const styles = useThemedStyles((t) => ({
    // The status block keeps the same distance from the button as the button
    // keeps from the text above it (24), so the column reads as one flow.
    status: { marginTop: t.spacing[24] },
  }));

  return (
    <View>
      <EmptyState
        icon={CalendarPlus}
        title="No plan yet"
        message="Your coach builds 7 days of workouts, meals and habits from your answers. It takes about a minute."
      >
        <Button
          label={flow.buttonLabel}
          size="lg"
          fullWidth
          loading={flow.running}
          disabled={flow.buttonDisabled}
          onPress={flow.start}
          accessibilityLabel={flow.running ? 'Building your plan' : flow.buttonLabel}
        />
      </EmptyState>
      {flow.state.status !== 'idle' ? (
        <View style={styles.status}>
          <GenerationStatus flow={flow} />
        </View>
      ) : null}
      <WellnessNote />
    </View>
  );
}
