/**
 * src/features/settings/components/TimezoneSheet.tsx
 *
 * Asks before changing the saved time zone and says what it changes: which day
 * counts as today. Used by the prompt at app open and by Settings.
 *
 * Accepting saves with PATCH { timezone } and closes once the server agreed.
 * Both accepting and dismissing are remembered, so the prompt does not come
 * back for the same zone.
 */

import { useRef } from 'react';
import { View } from 'react-native';

import { Notice } from '@/components/layout/Notice';
import { Button, Sheet, Text } from '@/components/ui';
import { saveTimezoneAnswer } from '@/lib/storage';
import { useThemedStyles } from '@/theme';

import { saveErrorMessage, useSaveProfile } from '../mutations';
import { rememberTimezoneAnswer, type TimezoneOffer } from '../timezonePrompt';

export type TimezoneSheetProps = {
  /** null = closed. */
  offer: TimezoneOffer | null;
  onClose: () => void;
};

export function TimezoneSheet({ offer, onClose }: TimezoneSheetProps) {
  const save = useSaveProfile();
  // A second tap in the same frame must not send the save twice.
  const saving = useRef(false);

  const styles = useThemedStyles((t) => ({
    // Two short paragraphs, 12 apart.
    body: { gap: t.spacing[12] },
    // The error card, only after a failed save.
    error: { marginTop: t.spacing[16] },
    // Buttons stacked full width, 32 below the text, 12 apart.
    actions: { marginTop: t.spacing[32], gap: t.spacing[12] },
  }));

  const finish = () => {
    if (offer) void rememberTimezoneAnswer(offer, saveTimezoneAnswer);
    save.reset();
    onClose();
  };

  const accept = async () => {
    if (!offer || saving.current) return;
    saving.current = true;
    try {
      await save.mutateAsync({ field: 'timezone', value: offer.zone });
      finish();
    } catch {
      // Shown below through save.error; the sheet stays open for another try.
    } finally {
      saving.current = false;
    }
  };

  const error = saveErrorMessage(save.error, 'timezone');

  return (
    <Sheet
      visible={offer !== null}
      title="Update your time zone?"
      onClose={finish}
      closeLabel="Keep the current time zone"
      busy={save.isPending}
    >
      {offer ? (
        <>
          <View style={styles.body}>
            <Text variant="body" color="textSecondary">
              {`This phone is in ${offer.zone}. Your plan follows ${offer.saved}.`}
            </Text>
            <Text variant="body" color="textSecondary">
              Updating changes which day counts as today, so your checklist and streak follow the new local day.
              Reminders move to the new local time.
            </Text>
          </View>
          {error ? (
            <View style={styles.error}>
              <Notice message={error} />
            </View>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Update time zone"
              size="lg"
              fullWidth
              loading={save.isPending}
              onPress={() => void accept()}
            />
            <Button
              label="Keep current"
              accessibilityLabel={`Keep ${offer.saved}`}
              variant="secondary"
              size="lg"
              fullWidth
              disabled={save.isPending}
              onPress={finish}
            />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
