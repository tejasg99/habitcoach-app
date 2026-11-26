/**
 * src/app/(tabs)/plan.tsx
 *
 * Plan tab: the brief's Week view (design doc 7, "Plan (weekly)").
 *
 *   Plan (title1)
 *   [Mon][Tue][Wed][Thu][Fri][Sat][Sun]      day chips; a dot marks today
 *   Friday  (Today)                          the selected day
 *   Workouts / Meals / Habits                that day's items, by position
 *   [progress card or error, while regenerating]
 *   Make a new plan                          secondary; asks first
 *   General wellness information, not medical advice.
 *
 * Data: GET /plan/week for the items, GET /plan/today only for `weekday`
 * (which day is today, decided by the server in the user's time zone). If
 * /plan/today fails, nothing is highlighted and the week opens on Monday.
 *
 * States: skeleton while loading, the "Generate my plan" empty state on 404,
 * a retry notice for other errors (+ Copy debug info when unexpected).
 * Refreshes on focus and on pull to refresh.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';

import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { TAB_BAR_CLEARANCE } from '@/components/layout/TabPlaceholder';
import { Button, Chip, Screen, Skeleton, Text } from '@/components/ui';
import { isApiError, isUnexpectedError } from '@/api/errors';
import { DayChips } from '@/features/plan/components/DayChips';
import { DayPlan } from '@/features/plan/components/DayPlan';
import { GeneratePlanEmptyState } from '@/features/plan/components/GeneratePlanEmptyState';
import { GenerationStatus } from '@/features/plan/components/GenerationStatus';
import { RegenerateSheet } from '@/features/plan/components/RegenerateSheet';
import { WellnessNote } from '@/features/plan/components/WellnessNote';
import { isNoPlan, useTodayPlan, useWeekPlan, type WeekPlan } from '@/features/plan/queries';
import { useGenerateFlow } from '@/features/plan/useGenerateFlow';
import { dayGroups, resolveSelectedDay } from '@/features/plan/week';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { dayName } from '@/lib/formatting';
import { useTheme, useThemedStyles } from '@/theme';

export default function PlanScreen() {
  const week = useWeekPlan();
  const today = useTodayPlan();
  const { colors, radius } = useTheme();
  useRefetchOnFocus(week.refetch);
  useRefetchOnFocus(today.refetch);

  // Pull to refresh, as on Today and Progress. Our own flag, so only a pull
  // shows the spinner (not focus refetches).
  const refetchWeek = week.refetch;
  const refetchToday = today.refetch;
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchWeek(), refetchToday()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchWeek, refetchToday]);

  const styles = useThemedStyles((t) => ({
    // Screen title with air under the status bar, like every top-level screen.
    title: { marginTop: t.spacing[24] },
    // Space between the title and whatever comes first below it.
    body: { marginTop: t.spacing[24] },
    // Loading placeholders: a chip-row block, then rows 12 apart.
    skeletonRows: { marginTop: t.spacing[32], gap: t.spacing[12] },
  }));

  let body: ReactNode;
  if (week.data) {
    body = <WeekView plan={week.data} todayWeekday={today.data?.weekday ?? null} />;
  } else if (week.error && isNoPlan(week.error)) {
    body = <GeneratePlanEmptyState />;
  } else if (week.error) {
    body = (
      <Notice message={isApiError(week.error) ? week.error.message : "We couldn't load your plan. Try again."}>
        <Button
          label="Try again"
          variant="secondary"
          size="sm"
          loading={week.isFetching}
          onPress={() => void week.refetch()}
        />
        {isUnexpectedError(week.error) ? <CopyDebugInfo /> : null}
      </Notice>
    );
  } else {
    // Loading: skeleton blocks in the shape of the real content (no spinner).
    body = (
      // One element for screen readers ("Loading your plan"), like the other tabs.
      <View accessible accessibilityLabel="Loading your plan" accessibilityRole="progressbar">
        <Skeleton height={36} radius={radius.pill} />
        <View style={styles.skeletonRows}>
          <Skeleton height={28} width="40%" />
          <Skeleton height={88} />
          <Skeleton height={88} />
          <Skeleton height={88} />
        </View>
      </View>
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
        Plan
      </Text>
      <View style={styles.body}>{body}</View>
    </Screen>
  );
}

/** The loaded week: day chips, the selected day's groups, and "Make a new plan". */
function WeekView({ plan, todayWeekday }: { plan: WeekPlan; todayWeekday: number | null }) {
  // null = the person hasn't picked a day yet, so follow the server's "today".
  const [picked, setPicked] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const flow = useGenerateFlow('Make a new plan');

  const selected = resolveSelectedDay(picked, todayWeekday);
  const groups = dayGroups(plan.items, selected);
  const isToday = selected === todayWeekday;

  const styles = useThemedStyles((t) => ({
    // The selected day's heading sits 32 under the chip row (a new section),
    // its groups 16 under the heading.
    dayHeader: { flexDirection: 'row', alignItems: 'center', marginTop: t.spacing[32], marginBottom: t.spacing[16] },
    // Gap between the day name and the "Today" label chip.
    todayChip: { marginLeft: t.spacing[12] },
    // The regenerate block is its own section at the end of the day.
    footer: { marginTop: t.spacing[40], gap: t.spacing[16] },
  }));

  const onRegeneratePress = () => {
    // A retry after a failed run doesn't ask again: the person already
    // confirmed, and the current plan is still in place.
    if (flow.state.status === 'failed') flow.start();
    else setConfirming(true);
  };

  return (
    <View>
      <DayChips selected={selected} today={todayWeekday} onSelect={setPicked} />

      <View style={styles.dayHeader}>
        <Text variant="title2" accessibilityRole="header">
          {dayName(selected)}
        </Text>
        {isToday ? (
          <View style={styles.todayChip}>
            <Chip label="Today" selected compact />
          </View>
        ) : null}
      </View>

      {groups.length > 0 ? (
        <DayPlan groups={groups} />
      ) : (
        <Notice tone="neutral" message={`Nothing is planned for ${dayName(selected)}.`} />
      )}

      <View style={styles.footer}>
        <GenerationStatus flow={flow} />
        <Button
          label={flow.buttonLabel}
          variant="secondary"
          size="lg"
          fullWidth
          loading={flow.running}
          disabled={flow.buttonDisabled}
          onPress={onRegeneratePress}
          accessibilityLabel={flow.running ? 'Building your new plan' : flow.buttonLabel}
        />
      </View>

      <WellnessNote />

      <RegenerateSheet
        visible={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          flow.start();
        }}
      />
    </View>
  );
}
