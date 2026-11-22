/**
 * src/features/progress/components/StreakHeatmap.tsx
 *
 * The streak calendar (design doc 3.5 / 7): the selected range laid out like
 * a wall calendar, one row per week, Monday to Sunday, one square per day.
 * Smaller and different in kind from the bar chart above it, so the chart
 * stays the screen's main visual.
 *
 * Square colours:
 *  - level 0 (nothing planned, or planned and nothing done): `surfaceMuted`.
 *    Missed days are neutral, never red (red is for errors, not guilt).
 *  - levels 1 to 4: the accent at 25 / 50 / 75 / 100% (the server's
 *    completion rate, see heatLevel() in chartData.ts).
 *  - today: a 4 px dot in the middle of its square, the tab's "today" mark.
 *
 * Built from plain Views (squares need no SVG). Screen readers get one
 * summary of the calendar instead of up to 90 squares.
 */

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, Text } from '@/components/ui';
import { dayNameShort } from '@/lib/formatting';
import { useTheme, useThemedStyles } from '@/theme';

import { heatmapSummary, toChartData, toHeatmapWeeks, type HeatCell, type HeatLevel } from '../chartData';
import type { Progress } from '../queries';
import type { ProgressRange } from '../range';

/** Square size and gap: 7 x 28 + 6 x 4 = 220 wide, fits the smallest phones. */
const CELL = 28;
const GAP = 4;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];

export type StreakHeatmapProps = {
  progress: Progress;
  range: ProgressRange;
};

export function StreakHeatmap({ progress, range }: StreakHeatmapProps) {
  const { dataViz } = useTheme();
  const weeks = toHeatmapWeeks(toChartData(progress));

  const styles = useThemedStyles((t) => ({
    // Card title, then 4 to its explanation.
    subtitle: { marginTop: t.spacing[4] },
    // The calendar block is centred in the card and starts 20 under the header.
    grid: { alignSelf: 'center', marginTop: t.spacing[20], gap: GAP },
    // One week (or the weekday header): seven fixed slots in a row.
    row: { flexDirection: 'row', gap: GAP },
    // Weekday initials sit centred above their column.
    headerCell: { width: CELL, alignItems: 'center' },
    // A day square: fixed size, small rounded corners, clipped so the tint
    // layer and the today dot stay inside the rounded shape.
    cell: {
      width: CELL,
      height: CELL,
      borderRadius: 6,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The neutral base every square starts from (level 0 shows only this).
    cellBase: { backgroundColor: t.colors.surfaceMuted },
    // The accent tint layer, laid over the whole square. Its opacity is the
    // level's step from `dataViz.heatmap`, so 25% reads as a light wash.
    // (Absolute + 0 on every side = stretch over the square, behind the dot.)
    tint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.colors.accent },
    // Blank slots before the range starts / after today keep the grid shape.
    blank: { width: CELL, height: CELL },
    // Today's mark: a 4 px dot centred in the square.
    todayDot: { width: 4, height: 4, borderRadius: t.radius.pill },
    // On light tints the dot is the accent; on the two strongest tints it
    // switches to `onAccent` so it stays visible.
    todayDotOnLight: { backgroundColor: t.colors.accent },
    todayDotOnStrong: { backgroundColor: t.colors.onAccent },
    // Legend: "Less [5 squares] More", 16 under the grid, plus the today mark.
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: t.spacing[16],
      columnGap: t.spacing[16],
      rowGap: t.spacing[8],
    },
    legendScale: { flexDirection: 'row', alignItems: 'center', gap: GAP },
    // Legend squares are the calendar's squares at a smaller size.
    legendSquare: { width: 12, height: 12, borderRadius: 3, overflow: 'hidden' },
    // The "Today" legend square is a little bigger so its 4 px dot fits.
    legendSquareToday: {
      width: 16,
      height: 16,
      borderRadius: 4,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[8] },
    legendLabelStart: { marginRight: t.spacing[4] },
    legendLabelEnd: { marginLeft: t.spacing[4] },
  }));

  // One square: the neutral base, the accent tint layer for levels 1-4, and an
  // optional child (the today dot).
  const renderSquare = (level: HeatLevel, style: StyleProp<ViewStyle>, child?: ReactNode) => (
    <View style={[style, styles.cellBase]}>
      {level > 0 ? <View style={[styles.tint, { opacity: dataViz.heatmap[level - 1] }]} /> : null}
      {child}
    </View>
  );

  const renderCell = (cell: HeatCell | null, index: number) => {
    if (!cell) return <View key={`blank-${index}`} style={styles.blank} />;
    const dot = cell.isToday ? (
      <View style={[styles.todayDot, cell.level >= 3 ? styles.todayDotOnStrong : styles.todayDotOnLight]} />
    ) : undefined;
    return <View key={cell.day}>{renderSquare(cell.level, styles.cell, dot)}</View>;
  };

  return (
    <Card>
      <Text variant="title3" accessibilityRole="header">
        Streak calendar
      </Text>
      <Text variant="callout" color="textSecondary" style={styles.subtitle}>
        Darker days had more of the plan done
      </Text>

      <View style={styles.grid} accessible accessibilityRole="image" accessibilityLabel={heatmapSummary(progress, range)}>
        <View style={styles.row}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={styles.headerCell}>
              <Text variant="caption" color="textSecondary" capScaling numberOfLines={1}>
                {dayNameShort(d).charAt(0)}
              </Text>
            </View>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week.find((c) => c)?.day} style={styles.row}>
            {week.map(renderCell)}
          </View>
        ))}
      </View>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.legendScale}>
          <Text variant="caption" color="textSecondary" style={styles.legendLabelStart}>
            Less
          </Text>
          {LEVELS.map((level) => (
            <View key={level}>{renderSquare(level, styles.legendSquare)}</View>
          ))}
          <Text variant="caption" color="textSecondary" style={styles.legendLabelEnd}>
            More
          </Text>
        </View>
        <View style={styles.legendItem}>
          {renderSquare(1, styles.legendSquareToday, <View style={[styles.todayDot, styles.todayDotOnLight]} />)}
          <Text variant="caption" color="textSecondary">
            Today
          </Text>
        </View>
      </View>
    </Card>
  );
}
