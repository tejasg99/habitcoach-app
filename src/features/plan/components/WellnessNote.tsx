/**
 * src/features/plan/components/WellnessNote.tsx
 *
 * The disclaimer the brief requires on the plan screens ("Privacy, safety and
 * accessibility"). Quiet on purpose: small `caption` text in the secondary
 * text colour (4.5:1 in both modes), centred, so it is always readable but
 * never competes with the plan itself.
 */

import { Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

export const WELLNESS_DISCLAIMER = 'General wellness information, not medical advice.';

export function WellnessNote() {
  const styles = useThemedStyles((t) => ({
    // Centred under the content, with clear space above it.
    note: { textAlign: 'center', marginTop: t.spacing[24] },
  }));

  return (
    <Text variant="caption" color="textSecondary" style={styles.note}>
      {WELLNESS_DISCLAIMER}
    </Text>
  );
}
