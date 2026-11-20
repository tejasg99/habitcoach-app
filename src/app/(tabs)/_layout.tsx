/**
 * src/app/(tabs)/_layout.tsx
 *
 * The main tab shell: Expo Router `Tabs` with the custom floating TabBar from
 * the design system (design doc 6: Today, Plan, Progress, Settings). Only
 * reachable while signed in and onboarded (guarded in the root layout).
 */

import { Tabs } from 'expo-router';
import { CalendarDays, ChartNoAxesColumn, Settings, Sun, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';

import { TabBar, type TabBarItem } from '@/components/ui';
import { useTheme } from '@/theme';

/** Label and icon per route file name. The order here is the order in the bar. */
const TAB_META: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Today', icon: Sun },
  plan: { label: 'Plan', icon: CalendarDays },
  progress: { label: 'Progress', icon: ChartNoAxesColumn },
  settings: { label: 'Settings', icon: Settings },
};

// The props Expo Router passes to a custom tab bar, taken from `Tabs` itself
// so we don't import the underlying react-navigation package directly.
type RouterTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Adapts router state to the design-system TabBar (which only knows keys and taps). */
function RouterTabBar({ state, emitter, navigateToTab }: RouterTabBarProps) {
  const items: TabBarItem[] = state.routes
    .filter((route) => route.name in TAB_META)
    .map((route) => ({ key: route.name, ...TAB_META[route.name]! }));

  return (
    <TabBar
      items={items}
      activeKey={state.routes[state.index]?.name ?? 'index'}
      onSelect={(name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return;
        // Same event sequence as the default tab bar, so screens can listen
        // for "tabPress" later (e.g. scroll to top on re-tap).
        const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented && state.routes[state.index]?.key !== route.key) {
          navigateToTab(route.key);
        }
      }}
    />
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <RouterTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Screens paint the theme background; the floating bar sits on top.
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
