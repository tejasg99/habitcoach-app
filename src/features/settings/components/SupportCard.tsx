/**
 * src/features/settings/components/SupportCard.tsx
 *
 * App version, platform and the latest X-Request-ID, with "Copy debug info".
 * Never tokens, bodies or account details (see src/lib/debugInfo.ts).
 */

import { View } from 'react-native';

import { useLatestRequestId } from '@/api/status';
import { CopyDebugInfo, debugContext } from '@/components/layout/CopyDebugInfo';
import { Card, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

import { SettingsRow } from './SettingsRow';

export function SupportCard() {
  // Subscribed, so the id on screen follows new requests.
  const latestRequestId = useLatestRequestId();
  const { appVersion, platform } = debugContext();

  const styles = useThemedStyles((t) => ({
    // Card title, a short note under it, then the details.
    title: { marginBottom: t.spacing[4] },
    note: { marginBottom: t.spacing[16] },
    // Details 12 apart, and 16 before the copy button.
    rows: { gap: t.spacing[12], marginBottom: t.spacing[16] },
  }));

  return (
    <Card>
      <Text variant="title3" accessibilityRole="header" style={styles.title}>
        Support
      </Text>
      <Text variant="callout" color="textSecondary" style={styles.note}>
        If something goes wrong, copy this and send it with your report.
      </Text>
      <View style={styles.rows}>
        <SettingsRow label="Version" value={appVersion ?? 'Unknown'} tabular />
        <SettingsRow label="Platform" value={platform} tabular />
        <SettingsRow label="Last request" value={latestRequestId ?? 'None yet'} />
      </View>
      <CopyDebugInfo variant="secondary" size="md" fullWidth />
    </Card>
  );
}
