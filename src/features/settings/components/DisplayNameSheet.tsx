/**
 * src/features/settings/components/DisplayNameSheet.tsx
 *
 * Edits the display name: PATCH /users/me { display_name }. At most 100
 * characters; blank clears it. A sheet rather than a field on the page, so the
 * keyboard and the floating tab bar never cover what is being typed.
 *
 * Mount it only while open: each opening then starts from the saved name.
 */

import { useState } from 'react';
import { View } from 'react-native';

import { Notice } from '@/components/layout/Notice';
import { Button, Input, Sheet, Text } from '@/components/ui';
import { isApiError } from '@/api/errors';
import { useThemedStyles } from '@/theme';

import { displayNameError } from '../displayName';
import { saveErrorMessage, useSaveDisplayName } from '../mutations';

export function DisplayNameSheet({ current, onClose }: { current: string | null; onClose: () => void }) {
  const [name, setName] = useState(current ?? '');
  const save = useSaveDisplayName();

  const styles = useThemedStyles((t) => ({
    // The field, 24 under the explanation.
    field: { marginTop: t.spacing[24] },
    // The error card (offline, server trouble), under the field.
    error: { marginTop: t.spacing[16] },
    // Buttons stacked full width, 32 below the field, 12 apart.
    actions: { marginTop: t.spacing[32], gap: t.spacing[12] },
  }));

  const tooLong = displayNameError(name);
  const serverMessage = saveErrorMessage(save.error, 'display_name');
  // A 422 belongs next to the field; anything else goes in the error card.
  const isFieldError = isApiError(save.error) && save.error.kind === 'validation';
  const unchanged = name.trim() === (current ?? '');

  const submit = () => {
    if (tooLong || save.isPending) return;
    if (unchanged) onClose();
    else save.mutate(name, { onSuccess: onClose });
  };

  return (
    <Sheet visible title="Display name" onClose={onClose} closeLabel="Keep the current name" busy={save.isPending}>
      <Text variant="body" color="textSecondary">
        Leave it blank to remove your name.
      </Text>
      <View style={styles.field}>
        <Input
          label="Name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (save.isError) save.reset();
          }}
          error={tooLong ?? (isFieldError ? serverMessage : undefined)}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          editable={!save.isPending}
          onSubmitEditing={submit}
        />
      </View>
      {serverMessage && !isFieldError ? (
        <View style={styles.error}>
          <Notice message={serverMessage} />
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Save name"
          size="lg"
          fullWidth
          loading={save.isPending}
          disabled={unchanged || tooLong !== undefined}
          onPress={submit}
        />
        <Button label="Cancel" variant="secondary" size="lg" fullWidth disabled={save.isPending} onPress={onClose} />
      </View>
    </Sheet>
  );
}
