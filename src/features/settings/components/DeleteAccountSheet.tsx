/**
 * src/features/settings/components/DeleteAccountSheet.tsx
 *
 * Confirmation before DELETE /users/me. It names what is lost and that it is
 * final. While the request runs the sheet cannot be closed. On success the
 * session store clears the account's data from the device and opens the login screen; on failure
 * nothing has changed locally and the sheet offers another try.
 */

import { useRef, useState } from 'react';
import { View } from 'react-native';

import { isApiError } from '@/api/errors';
import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { Button, Sheet, Text } from '@/components/ui';
import { deleteAccount } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

import { saveErrorMessage } from '../mutations';

export function DeleteAccountSheet({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<Error | null>(null);
  const [deleting, setDeleting] = useState(false);
  // A second tap in the same frame must not send the request twice.
  const running = useRef(false);

  const styles = useThemedStyles((t) => ({
    // The error card, only after a failed attempt.
    error: { marginTop: t.spacing[16] },
    // Buttons stacked full width, 32 below the text, 12 apart.
    actions: { marginTop: t.spacing[32], gap: t.spacing[12] },
  }));

  const confirm = async () => {
    if (running.current) return;
    running.current = true;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Delete failed'));
      setDeleting(false);
      running.current = false;
    }
  };

  const message = saveErrorMessage(error, '');

  return (
    <Sheet visible title="Delete your account?" onClose={onClose} closeLabel="Keep my account" busy={deleting}>
      <Text variant="body" color="textSecondary">
        This removes your account, plan, streak and everything you&apos;ve checked off. It can&apos;t be undone.
      </Text>
      {message ? (
        <View style={styles.error}>
          <Notice message={message}>
            {isApiError(error) && (error.status ?? 0) >= 500 ? <CopyDebugInfo /> : null}
          </Notice>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Delete account"
          variant="destructive"
          size="lg"
          fullWidth
          loading={deleting}
          onPress={() => void confirm()}
        />
        <Button label="Keep my account" variant="secondary" size="lg" fullWidth disabled={deleting} onPress={onClose} />
      </View>
    </Sheet>
  );
}
