/**
 * src/features/progress/components/CompletionChart.tsx
 *
 * Planned vs completed per day: the screen's main chart and its one rich
 * element. Drawn with react-native-svg (no chart library; see the
 * Implementation notes for why).
 *
 * How each day is drawn (data from chartData.ts, colours design doc 3.5):
 *  - planned:     a pale bar (accent at 20%) as tall as the day's plan
 *  - completed:   a solid bar (accent at 100%) inside it, as tall as what was done
 *  - today:       the completed part at 65% (the day is still going) plus the
 *                 4 px accent dot under the bar, the same "today" mark the
 *                 Plan tab's day chips use
 *  - no plan:     nothing at all (completion_rate null is EMPTY, never 0%)
 *
 * One accent in tints only, no axis lines or grid: the bars sit straight on
 * the card. Screen readers get one text summary instead of N tiny bars.
 */

import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { Card, Text } from '@/components/ui';
import { useTheme, useThemedStyles } from '@/theme';

import { axisLabels, chartSummary, toChartData } from '../chartData';
import type { Progress } from '../queries';
import type { ProgressRange } from '../range';

/** Height of the bar area. A 4 pt multiple; tall enough for 1-item steps to read. */
const BAR_AREA = 144;
/** Room under the bars for the today dot (4 px dot, 4 above it, 4 spare). */
const DOT_ROW = 12;
/** Widest a bar gets (a week); longer ranges shrink to fit their slot. */
const MAX_BAR = 24;
/** Narrowest a bar gets (90 days on a small phone). */
const MIN_BAR = 2;

export type CompletionChartProps = {
  progress: Progress;
  range: ProgressRange;
};

export function CompletionChart({ progress, range }: CompletionChartProps) {
  const { colors, dataViz } = useTheme();
  // The SVG needs a pixel width; measure the space the card gives it.
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const chart = toChartData(progress);
  const labels = axisLabels(chart);
  const perBarLabels = labels.length === chart.days.length;

  // Each day gets an equal slot; the bar fills 60% of it so neighbours keep a
  // gap. Corner radius is at most 4, and never more than half the bar width.
  const slot = chart.days.length > 0 ? width / chart.days.length : 0;
  const barWidth = Math.min(MAX_BAR, Math.max(MIN_BAR, slot * 0.6));
  const barRadius = Math.min(4, barWidth / 2);

  const styles = useThemedStyles((t) => ({
    // Card title, then 4 to its one-line explanation.
    subtitle: { marginTop: t.spacing[4] },
    // The drawing starts 20 under the header block (the card's own padding
    // rhythm), so the header reads as a separate group.
    plot: { marginTop: t.spacing[20] },
    // Same height as the drawing, used for the instant before the width is known.
    plotPlaceholder: { height: BAR_AREA + DOT_ROW },
    // Axis labels in one row under the plot. For a week each label sits under
    // its own bar (equal flex cells); longer ranges show just the two ends.
    axis: { flexDirection: 'row', marginTop: t.spacing[4] },
    axisEnds: { justifyContent: 'space-between' },
    axisCell: { flex: 1, alignItems: 'center' },
    // Legend: 16 under the axis, items wrap onto a second line at large text.
    legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: t.spacing[16], columnGap: t.spacing[16], rowGap: t.spacing[8] },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[8] },
    // A 12 px rounded square in the same tint as the bars it explains.
    swatch: { width: 12, height: 12, borderRadius: 4, backgroundColor: t.colors.accent },
    // The today mark: the same 4 px accent dot as under the bars.
    legendDot: { width: 4, height: 4, borderRadius: t.radius.pill, backgroundColor: t.colors.accent, marginHorizontal: 4 },
  }));

  return (
    <Card>
      <Text variant="title3" accessibilityRole="header">
        Day by day
      </Text>
      <Text variant="callout" color="textSecondary" style={styles.subtitle}>
        What was planned and what got done
      </Text>

      {/* The whole drawing is ONE accessible image with a full text summary. */}
      <View
        style={styles.plot}
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={chartSummary(progress, range)}
      >
        {width > 0 ? (
          <Svg width={width} height={BAR_AREA + DOT_ROW}>
            {chart.days.map((d, i) => {
              if (d.status === 'noPlan') return null; // empty, not 0%
              const x = i * slot + (slot - barWidth) / 2;
              const plannedHeight = d.plannedRatio * BAR_AREA;
              const completedHeight = d.completedRatio * BAR_AREA;
              return (
                <G key={d.day}>
                  <Rect
                    x={x}
                    y={BAR_AREA - plannedHeight}
                    width={barWidth}
                    height={plannedHeight}
                    rx={barRadius}
                    fill={colors.accent}
                    fillOpacity={dataViz.tint.soft}
                  />
                  {completedHeight > 0 ? (
                    <Rect
                      x={x}
                      y={BAR_AREA - completedHeight}
                      width={barWidth}
                      height={completedHeight}
                      rx={barRadius}
                      fill={colors.accent}
                      fillOpacity={d.status === 'inProgress' ? dataViz.tint.strong : dataViz.tint.full}
                    />
                  ) : null}
                </G>
              );
            })}
            {chart.today ? (
              <Circle
                cx={chart.days.indexOf(chart.today) * slot + slot / 2}
                cy={BAR_AREA + 6}
                r={2}
                fill={colors.accent}
              />
            ) : null}
          </Svg>
        ) : (
          // Reserve the height before the first layout pass so nothing jumps.
          <View style={styles.plotPlaceholder} />
        )}
      </View>

      <View
        style={[styles.axis, !perBarLabels && styles.axisEnds]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {perBarLabels
          ? labels.map((label, i) => (
              <View key={chart.days[i]!.day} style={styles.axisCell}>
                <Text variant="caption" color="textSecondary" capScaling numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))
          : labels.map((label) => (
              <Text key={label} variant="caption" color="textSecondary" capScaling>
                {label}
              </Text>
            ))}
      </View>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { opacity: dataViz.tint.soft }]} />
          <Text variant="caption" color="textSecondary">
            Planned
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.swatch} />
          <Text variant="caption" color="textSecondary">
            Done
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text variant="caption" color="textSecondary">
            Today, in progress
          </Text>
        </View>
      </View>
    </Card>
  );
}
