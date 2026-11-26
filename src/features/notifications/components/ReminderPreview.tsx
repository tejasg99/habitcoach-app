/**
 * src/features/notifications/components/ReminderPreview.tsx
 *
 * The explanation screen's one rich element: the reminder as it will look when
 * it arrives. The text is the server's own wording for someone without a
 * streak (backend: build_reminder). Not a real notification, so screen readers
 * get one summary label.
 */

import { View } from 'react-native';
import { Sun } from 'lucide-react-native';

import { Card, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

const TITLE = "Ready for today's plan?";
const BODY = 'Your plan for today is waiting. One activity is enough to get started.';

/** `time` is the display label, e.g. "8:00 pm". */
export function ReminderPreview({ time }: { time: string }) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Icon column on the left, message on the right, top aligned so the icon
    // stays beside the title when large text wraps.
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    // 44 px soft accent circle: the only colour on the card.
    icon: {
      width: t.layout.minTap,
      height: t.layout.minTap,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: t.spacing[16],
      backgroundColor: t.colors.accentSoft,
    },
    // Takes the remaining width so the text wraps instead of overflowing.
    text: { flex: 1, gap: t.spacing[4] },
    // App name and time share the first line, and wrap under each other when
    // the font is very large.
    meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: t.spacing[8] },
  }));

  return (
    <Card accessible accessibilityLabel={`Example reminder, around ${time}. ${TITLE} ${BODY}`}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Sun size={24} strokeWidth={1.75} color={colors.accent} />
        </View>
        <View style={styles.text}>
          <View style={styles.meta}>
            <Text variant="caption" color="textSecondary">
              AI Habit Coach
            </Text>
            <Text variant="caption" color="textSecondary" tabular>
              {`Around ${time}`}
            </Text>
          </View>
          <Text variant="bodyStrong">{TITLE}</Text>
          <Text variant="callout" color="textSecondary">
            {BODY}
          </Text>
        </View>
      </View>
    </Card>
  );
}
