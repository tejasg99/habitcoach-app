/**
 * src/features/plan/components/GenerationStatus.tsx
 *
 * What sits under the generate button:
 *  - running: a calm card with what is happening right now and a slowly
 *    filling bar (the copy changes as time passes; a run takes up to a minute)
 *  - failed:  a Notice with the plain-language reason. Retrying is done with
 *    the main button above (its label becomes "Try again"), so the notice only
 *    adds "Copy debug info" for unexpected server failures.
 *  - idle:    nothing
 */

import { View } from 'react-native';

import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { Card, ProgressBar, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import type { GenerateFlow } from '../useGenerateFlow';

export function GenerationStatus({ flow }: { flow: GenerateFlow }) {
  const styles = useThemedStyles((t) => ({
    // Small gap between the card's heading and its explanation line.
    title: { marginBottom: t.spacing[4] },
    // The bar sits clearly below the text, as the last thing in the card.
    bar: { marginTop: t.spacing[16] },
  }));

  const { state } = flow;

  if (state.status === 'running') {
    const { title, detail, progress } = flow.progressCopy;
    return (
      // A live region, so screen readers hear each new stage as it changes.
      <Card compact accessibilityLiveRegion="polite" accessible accessibilityLabel={`Building your plan. ${title}`}>
        <Text variant="bodyStrong" style={styles.title}>
          {title}
        </Text>
        <Text variant="callout" color="textSecondary">
          {detail}
        </Text>
        <View style={styles.bar}>
          <ProgressBar progress={progress} accessibilityLabel="Building your plan" />
        </View>
      </Card>
    );
  }

  if (state.status === 'failed') {
    const { failure } = state;
    // A full daily limit or a plan that "just finished" are not errors the
    // person caused or can fix by retrying, so they read as neutral info.
    const neutral = failure.kind === 'dailyLimit' || failure.kind === 'justGenerated';
    return (
      <Notice tone={neutral ? 'neutral' : 'danger'} message={failure.message}>
        {failure.showDebugInfo ? <CopyDebugInfo /> : null}
      </Notice>
    );
  }

  return null;
}
