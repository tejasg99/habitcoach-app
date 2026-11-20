/**
 * src/features/plan/components/DayPlan.tsx
 *
 * One day of the plan: its items grouped by type (workouts, meals, habits),
 * each group in the order the coach listed it, each item as a row.
 *
 * Rows follow the habit-row anatomy (design doc 6) minus the check circle:
 * the Plan tab is for reading the week, checking things off happens on Today.
 *   - title in `bodyStrong`, description in `callout` / textSecondary
 *   - `target_metric` (e.g. "3 x 12 reps") as a quiet non-interactive chip
 * Space separates everything; there are no dividers or borders.
 */

import { Dumbbell, Repeat, Utensils, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Chip, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import type { PlanItem, PlanItemType } from '../queries';
import { GROUP_LABELS, type ItemGroup } from '../week';

const GROUP_ICONS: Record<PlanItemType, LucideIcon> = {
  workout: Dumbbell,
  meal: Utensils,
  habit: Repeat,
};

export function DayPlan({ groups }: { groups: ItemGroup<PlanItem>[] }) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Groups are separate sections: 24 between them (larger than the 12
    // between rows inside a group, so each group reads as one block).
    groups: { gap: t.spacing[24] },
    // Group heading: icon circle + label on one line, 12 above the rows.
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: t.spacing[12] },
    // 32 px accentSoft circle holding the 20 px type icon (design doc:
    // accentSoft is the icon background tint).
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: t.radius.pill,
      backgroundColor: t.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: t.spacing[12],
    },
    // Rows inside a group, 12 apart (design doc: gap between cards in a list).
    rows: { gap: t.spacing[12] },
    // An item row: surface card, list-row radius (16), compact padding and the
    // soft e1 lift. minHeight 64 matches the habit row.
    row: {
      minHeight: 64,
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.md,
      padding: t.layout.cardPaddingCompact,
      ...t.shadows.e1,
    },
    // Small gap from the title to its description.
    description: { marginTop: t.spacing[4] },
    // The target chip sits under the text with a little air.
    target: { marginTop: t.spacing[12] },
  }));

  return (
    <View style={styles.groups}>
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.type];
        return (
          <View key={group.type}>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Icon size={20} strokeWidth={1.75} color={colors.accentText} />
              </View>
              <Text variant="title3" accessibilityRole="header">
                {GROUP_LABELS[group.type]}
              </Text>
            </View>
            <View style={styles.rows}>
              {group.items.map((item) => (
                <View key={item.id} style={styles.row} accessible accessibilityLabel={rowLabel(item)}>
                  <Text variant="bodyStrong">{item.title}</Text>
                  {item.description ? (
                    <Text variant="callout" color="textSecondary" style={styles.description}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.target_metric ? (
                    <View style={styles.target}>
                      <Chip label={item.target_metric} compact />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** One sentence for screen readers, so a row is read in one go. */
function rowLabel(item: PlanItem): string {
  return [item.title, item.description, item.target_metric ? `Target: ${item.target_metric}` : null]
    .filter(Boolean)
    .join('. ');
}
