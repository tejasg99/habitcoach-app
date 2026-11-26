/**
 * src/features/plan/components/RegenerateSheet.tsx
 *
 * Confirmation before replacing an existing plan (brief, "Regenerating a
 * plan"). A bottom sheet, which the design doc prefers over centred dialogs:
 * `surface` fill, `radiusXl` top corners, a 36 x 4 grabber, `scrim` behind.
 *
 * It says plainly what is kept (progress, streak) and what is not (items
 * checked today on the current plan). The primary action makes the new plan;
 * the secondary keeps the current one. Tapping the scrim or Android back also
 * keeps it.
 */

import { Modal, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { useThemedStyles } from '@/theme';

export type RegenerateSheetProps = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RegenerateSheet({ visible, onConfirm, onCancel }: RegenerateSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const styles = useThemedStyles((t) => ({
    // Fills the screen; the sheet is pushed to the bottom edge.
    backdrop: { flex: 1, justifyContent: 'flex-end' },
    // The dimmed layer behind the sheet. Absolute so it covers everything and
    // catches taps outside the sheet.
    scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.colors.scrim },
    // The sheet: surface colour, large rounded top corners, screen-edge
    // padding on the sides and the e3 lift used for floating layers.
    sheet: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      paddingHorizontal: t.layout.screenPadding,
      paddingTop: t.spacing[12],
      ...t.shadows.e3,
    },
    // The grabber: a short muted pill centred at the top, a hint that this is a sheet.
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.surfaceMuted,
      marginBottom: t.spacing[24],
    },
    // Title, then the explanation 8 below it.
    title: { marginBottom: t.spacing[8] },
    // Buttons stacked full width, 32 below the text, 12 apart.
    actions: { marginTop: t.spacing[32], gap: t.spacing[12] },
  }));

  return (
    <Modal
      visible={visible}
      transparent
      // Slides up normally; with the OS "reduce motion" setting on it only fades in.
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Keep my plan" />
        {/* Bottom padding clears the home indicator, plus 24 of air. */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <Text variant="title2" accessibilityRole="header" style={styles.title}>
            Make a new plan?
          </Text>
          <Text variant="body" color="textSecondary">
            Your new plan replaces this one. Your progress and streak stay, but anything you checked off today
            won&apos;t carry over to the new plan.
          </Text>
          <View style={styles.actions}>
            <Button label="Make a new plan" size="lg" fullWidth onPress={onConfirm} />
            <Button label="Keep this plan" variant="secondary" size="lg" fullWidth onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
