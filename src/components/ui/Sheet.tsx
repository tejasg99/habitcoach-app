/**
 * src/components/ui/Sheet.tsx
 *
 * Bottom sheet (design doc 6): `surface` fill, `radiusXl` top corners, a
 * 36 x 4 grabber, `scrim` behind. Tapping the scrim or Android back closes it,
 * unless `busy` (a request is running and its result must not be missed).
 * The sheet moves up with the keyboard and scrolls if large text makes it
 * taller than the screen.
 */

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/theme';
import { Text } from './Text';

export type SheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** What tapping outside does, for screen readers. */
  closeLabel: string;
  /** Ignore the scrim and Android back while something is running. */
  busy?: boolean;
  children: ReactNode;
};

export function Sheet({ visible, title, onClose, closeLabel, busy = false, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const styles = useThemedStyles((t) => ({
    // Fills the screen; the sheet is pushed to the bottom edge.
    backdrop: { flex: 1, justifyContent: 'flex-end' },
    // The dimmed layer behind the sheet. Absolute so it covers everything and
    // catches taps outside the sheet.
    scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.colors.scrim },
    // The sheet: surface colour, large rounded top corners and the e3 lift used
    // for floating layers. It never grows past 90% of the screen, so a strip of
    // scrim always stays visible to tap.
    sheet: {
      maxHeight: '90%',
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
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
    // Scroll area: only as tall as its content (no grow), screen-edge padding
    // at the sides so it lines up with the screen behind.
    scroll: { flexGrow: 0, flexShrink: 1 },
    content: { paddingHorizontal: t.layout.screenPadding },
    // Title, then the body 8 below it.
    title: { marginBottom: t.spacing[8] },
  }));

  const close = busy ? undefined : onClose;

  return (
    <Modal
      visible={visible}
      transparent
      // Slides up normally; with the OS "reduce motion" setting on it only
      // fades in (design doc 8: replace movement with simple fades).
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={() => close?.()}
      statusBarTranslucent
    >
      {/* "padding" lifts the sheet by the keyboard height on both platforms. */}
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable
          style={styles.scrim}
          onPress={close}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.grabber} />
          <ScrollView
            style={styles.scroll}
            // Bottom padding clears the home indicator, plus 24 of air.
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text variant="title2" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
