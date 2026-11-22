/**
 * src/app/(tabs)/progress.tsx
 *
 * Progress tab (Milestone 6). Reads GET /progress?days=N for the picked range
 * (7, 30 or 90 days) through the query cache.
 *
 * Layout (design doc 7, "Hero card with streak and completion rate -> weekly
 * chart -> streak calendar heatmap"): title -> range chips -> hero (total,
 * streak, best streak) -> planned vs done chart -> streak calendar. States:
 *  - loading: skeleton blocks
 *  - no activity at all yet: an empty state that points to Today
 *  - error on the first load: a danger notice with Try again (+ Copy debug info on 5xx)
 *  - switching range: the previous range stays on screen, dimmed, until the
 *    new one arrives (no skeleton flash)
 *
 * Refreshes on focus, on pull to refresh, and after every log, undo or new
 * plan (those invalidate ['progress']). No polling. Every number shown comes
 * from the server; chartData.ts only reshapes it.
 */

import { router } from 'expo-router';
import { ChartNoAxesColumn } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';

import { isApiError } from '@/api/errors';
import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { EmptyState } from '@/components/layout/EmptyState';
import { Notice } from '@/components/layout/Notice';
import { TAB_BAR_CLEARANCE } from '@/components/layout/TabPlaceholder';
import { Button, Screen, Text } from '@/components/ui';
import { isProgressEmpty } from '@/features/progress/chartData';
import { CompletionChart } from '@/features/progress/components/CompletionChart';
import { ProgressHero } from '@/features/progress/components/ProgressHero';
import { ProgressSkeleton } from '@/features/progress/components/ProgressSkeleton';
import { RangeSelector } from '@/features/progress/components/RangeSelector';
import { StreakHeatmap } from '@/features/progress/components/StreakHeatmap';
import { useProgress } from '@/features/progress/queries';
import { DEFAULT_PROGRESS_RANGE, toProgressRange, type ProgressRange } from '@/features/progress/range';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { useTheme, useThemedStyles } from '@/theme';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [range, setRange] = useState<ProgressRange>(DEFAULT_PROGRESS_RANGE);
  const progress = useProgress(range);

  const refetchProgress = progress.refetch;
  const refetch = useCallback(() => refetchProgress(), [refetchProgress]);
  useRefetchOnFocus(refetch);

  // Our own flag, so only a pull shows the spinner (not focus refetches).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const styles = useThemedStyles((t) => ({
    // Screen title with air under the status bar, like every top-level screen.
    title: { marginTop: t.spacing[24] },
    // Space between the title and the content below it.
    body: { marginTop: t.spacing[24] },
    // The hero sits 16 under the range chips: close, because the chips
    // control what the hero counts.
    hero: { marginTop: t.spacing[16] },
    // The two chart cards follow at the section gap and sit 12 apart.
    charts: { marginTop: t.layout.sectionGap, gap: t.layout.cardGap },
    // While an older range is still showing, the content is dimmed so the
    // chip change is acknowledged at once without a loading flash.
    stale: { opacity: 0.6 },
  }));

  const data = progress.data;
  // The data on screen may belong to the previously picked range while the
  // new one loads; label everything with the range the data is really for.
  // (The server returns exactly `days` entries, so their count is that range.)
  const shownRange = progress.isPlaceholderData && data ? toProgressRange(data.days.length) : range;

  let body: ReactNode;
  if (progress.isPending) {
    body = <ProgressSkeleton />;
  } else if (!data) {
    const error = progress.error;
    body = (
      <Notice message={isApiError(error) ? error.message : "We couldn't load your progress. Try again."}>
        <Button
          label="Try again"
          variant="secondary"
          size="sm"
          loading={progress.isFetching}
          onPress={() => void progress.refetch()}
        />
        {isApiError(error) && (error.status ?? 0) >= 500 ? <CopyDebugInfo /> : null}
      </Notice>
    );
  } else if (isProgressEmpty(data)) {
    body = (
      <EmptyState
        icon={ChartNoAxesColumn}
        title="No activity yet"
        message="Check off an item on Today and your days start filling in here."
      >
        <Button label="Go to Today" onPress={() => router.navigate('/')} />
      </EmptyState>
    );
  } else {
    body = (
      <>
        <RangeSelector value={range} onChange={setRange} />
        <View
          style={progress.isPlaceholderData && styles.stale}
          accessibilityState={{ busy: progress.isPlaceholderData }}
        >
          <View style={styles.hero}>
            <ProgressHero progress={data} range={shownRange} />
          </View>
          <View style={styles.charts}>
            <CompletionChart progress={data} range={shownRange} />
            <StreakHeatmap progress={data} range={shownRange} />
          </View>
        </View>
      </>
    );
  }

  return (
    <Screen
      scroll
      bottomSpace={TAB_BAR_CLEARANCE}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          // Spinner in the accent (iOS tint, Android colours) on a raised disc.
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surfaceRaised}
        />
      }
    >
      <Text variant="title1" accessibilityRole="header" style={styles.title}>
        Progress
      </Text>
      <View style={styles.body}>{body}</View>
    </Screen>
  );
}
