/**
 * src/app/(tabs)/index.tsx
 *
 * Today tab (Milestone 5). Reads GET /plan/today (primed by the startup gate)
 * and GET /progress/streak through the query cache.
 *
 * Layout (design doc 7): title + date -> hero (progress) -> streak banner ->
 * checklist grouped by type. States:
 *  - loading: skeleton blocks
 *  - 404 (no active plan): the "Generate my plan" empty state and flow
 *  - other errors: a danger notice with Try again (+ Copy debug info on 5xx)
 *  - a plan with no items today: a quiet empty state (should not happen; every
 *    plan day has at least one item)
 *
 * Data refreshes on focus, on pull to refresh, and after every log or undo
 * (logging.ts invalidates Today, Progress and the streak). No polling. The
 * streak banner is optional: while it loads or if it fails, it is left out
 * rather than blocking the checklist.
 */

import { CalendarCheck } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';

import { isApiError, isUnexpectedError } from '@/api/errors';
import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { EmptyState } from '@/components/layout/EmptyState';
import { Notice } from '@/components/layout/Notice';
import { TAB_BAR_CLEARANCE } from '@/components/layout/TabPlaceholder';
import { Button, Screen, Skeleton, Text } from '@/components/ui';
import { GeneratePlanEmptyState } from '@/features/plan/components/GeneratePlanEmptyState';
import { isNoPlan, useTodayPlan } from '@/features/plan/queries';
import { useStreak } from '@/features/progress/queries';
import { todayGroups, todaySummary } from '@/features/today/checklist';
import { StreakBanner } from '@/features/today/components/StreakBanner';
import { TodayChecklist } from '@/features/today/components/TodayChecklist';
import { TodayHero } from '@/features/today/components/TodayHero';
import { TodaySkeleton } from '@/features/today/components/TodaySkeleton';
import { TodayToast } from '@/features/today/components/TodayToast';
import { useTodayActions } from '@/features/today/useTodayActions';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatTodayDate } from '@/lib/formatting';
import { useTheme, useThemedStyles } from '@/theme';

export default function TodayScreen() {
  const { colors, radius } = useTheme();
  const today = useTodayPlan();
  const streak = useStreak();
  const { toggle, busyIds, notice, dismissNotice } = useTodayActions();

  const refetchTodayPlan = today.refetch;
  const refetchStreak = streak.refetch;
  const refetchAll = useCallback(
    () => Promise.all([refetchTodayPlan(), refetchStreak()]),
    [refetchTodayPlan, refetchStreak],
  );
  useRefetchOnFocus(refetchAll);

  // Our own flag, so only a pull shows the spinner (not focus refetches).
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  const styles = useThemedStyles((t) => ({
    // Holds the screen and the toast layered over it.
    root: { flex: 1 },
    // Screen title with air under the status bar, like every top-level screen.
    title: { marginTop: t.spacing[24] },
    // The date sits tight under the title (4), as its subtitle.
    date: { marginTop: t.spacing[4] },
    // Space between the header and the content below it.
    body: { marginTop: t.spacing[24] },
    // Hero and streak banner read as one summary block: 12 apart.
    summary: { gap: t.layout.cardGap },
    // Section gap (32) between the summary and the checklist.
    checklist: { marginTop: t.layout.sectionGap },
  }));

  // A 404 wins over older cached data: the plan is gone (e.g. replaced and then
  // archived elsewhere), so the generate flow replaces the stale checklist.
  const noPlan = isNoPlan(today.error);
  const data = noPlan ? undefined : today.data;

  let body: ReactNode;
  if (today.isPending) {
    body = <TodaySkeleton />;
  } else if (noPlan) {
    body = <GeneratePlanEmptyState />;
  } else if (!data) {
    // Only reached on a failed first load; a failed refetch keeps the cached day.
    const error = today.error;
    body = (
      <Notice message={isApiError(error) ? error.message : "We couldn't load today. Try again."}>
        <Button
          label="Try again"
          variant="secondary"
          size="sm"
          loading={today.isFetching}
          onPress={() => void today.refetch()}
        />
        {isUnexpectedError(error) ? <CopyDebugInfo /> : null}
      </Notice>
    );
  } else if (data.items.length === 0) {
    body = (
      <EmptyState
        icon={CalendarCheck}
        title="Nothing planned today"
        message="Enjoy the rest. Your plan picks up again tomorrow."
      />
    );
  } else {
    body = (
      <>
        <View style={styles.summary}>
          <TodayHero summary={todaySummary(data.items)} />
          {streak.data ? (
            <StreakBanner streak={streak.data} />
          ) : streak.isPending ? (
            <Skeleton height={72} radius={radius.lg} />
          ) : null}
        </View>
        <View style={styles.checklist}>
          <TodayChecklist groups={todayGroups(data.items)} busyIds={busyIds} onToggle={toggle} />
        </View>
      </>
    );
  }

  return (
    <View style={styles.root}>
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
          Today
        </Text>
        {data ? (
          <Text variant="callout" color="textSecondary" style={styles.date}>
            {formatTodayDate(data.weekday, data.local_date)}
          </Text>
        ) : null}
        <View style={styles.body}>{body}</View>
      </Screen>
      <TodayToast notice={notice} onDismiss={dismissNotice} />
    </View>
  );
}
