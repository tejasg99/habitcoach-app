/**
 * src/features/settings/components/AccountCard.tsx
 *
 * Email (read only), display name, log out, delete account. Log out and delete
 * work even if the account details could not be loaded.
 */

import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Skeleton, Text } from '@/components/ui';
import { signOut } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

import type { Me } from '../queries';
import { DeleteAccountSheet } from './DeleteAccountSheet';
import { DisplayNameSheet } from './DisplayNameSheet';
import { SettingsRow } from './SettingsRow';

/** `loading`: the account is still being read (nothing cached, no error yet). */
export function AccountCard({ me, loading = false }: { me: Me | undefined; loading?: boolean }) {
  const [sheet, setSheet] = useState<'name' | 'delete' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const styles = useThemedStyles((t) => ({
    // Card title, 16 above the first row.
    title: { marginBottom: t.spacing[16] },
    // The details, 12 apart, and 24 of air before the actions that leave.
    rows: { gap: t.spacing[12], marginBottom: t.spacing[24] },
    actions: { gap: t.spacing[12] },
  }));

  const logOut = () => {
    setLoggingOut(true);
    void signOut().finally(() => setLoggingOut(false));
  };

  return (
    <Card>
      <Text variant="title3" accessibilityRole="header" style={styles.title}>
        Account
      </Text>
      {me ? (
        <View style={styles.rows}>
          <SettingsRow label="Email" value={me.email} />
          <SettingsRow
            label="Display name"
            value={me.display_name ?? 'Not set'}
            onPress={() => setSheet('name')}
            accessibilityHint="Opens a field to change it"
          />
        </View>
      ) : loading ? (
        // Placeholders where the two detail rows will be (52 tall, like SettingsRow).
        <View style={styles.rows}>
          <Skeleton height={52} />
          <Skeleton height={52} />
        </View>
      ) : null}
      <View style={styles.actions}>
        {/* Log out can be undone by signing in again, so only its label is red.
            Delete cannot, so it keeps the full destructive tint. */}
        <Button label="Log out" variant="neutralDanger" fullWidth loading={loggingOut} onPress={logOut} />
        <Button
          label="Delete account"
          variant="destructive"
          fullWidth
          disabled={loggingOut}
          onPress={() => setSheet('delete')}
        />
      </View>

      {sheet === 'name' && me ? <DisplayNameSheet current={me.display_name} onClose={() => setSheet(null)} /> : null}
      {sheet === 'delete' ? <DeleteAccountSheet onClose={() => setSheet(null)} /> : null}
    </Card>
  );
}
