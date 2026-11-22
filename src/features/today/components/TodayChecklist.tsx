/**
 * src/features/today/components/TodayChecklist.tsx
 *
 * Today's items grouped by type (workouts, meals, habits), each as a HabitRow.
 * Group headings match the Plan tab (icon in an `accentSoft` circle + title3),
 * so the same day looks the same in both places.
 *
 * Each row shows the target (if any) as its first caption line and the
 * description, cut to two lines, as the second. The full text is on the Plan tab.
 */

import { View } from 'react-native';

import { HabitRow, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import { GROUP_ICONS } from '../../plan/components/DayPlan';
import { GROUP_LABELS, type ItemGroup } from '../../plan/week';
import type { TodayItem } from '../checklist';

export type TodayChecklistProps = {
  groups: ItemGroup<TodayItem>[];
  busyIds: ReadonlySet<number>;
  onToggle: (itemId: number) => void;
};

export function TodayChecklist({ groups, busyIds, onToggle }: TodayChecklistProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((t) => ({
    // Groups are separate sections: 24 between them, more than the 12 between
    // rows inside a group, so each group reads as one block.
    groups: { gap: t.spacing[24] },
    // Group heading: icon circle + label on one line, 12 above the rows.
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: t.spacing[12] },
    // 32 px accentSoft circle holding the 20 px type icon (same as Plan).
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
    rows: { gap: t.layout.cardGap },
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
                <HabitRow
                  key={item.id}
                  title={item.title}
                  caption={item.target_metric}
                  detail={item.description}
                  checked={item.completed}
                  busy={busyIds.has(item.id)}
                  onPress={() => onToggle(item.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
