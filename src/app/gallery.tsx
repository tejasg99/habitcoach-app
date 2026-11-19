/**
 * src/app/gallery.tsx
 *
 * DEV-ONLY design gallery: every primitive on one scrolling page, with
 * controls to switch mode (system / light / dark) and accent, so the design
 * can be reviewed visually. In release builds (`__DEV__` false) this route
 * redirects away, so it is never reachable.
 */

import { Redirect } from 'expo-router';
import { CalendarDays, ChartNoAxesColumn, Plus, Settings, Sun, Trash2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  HeroCard,
  IconButton,
  Input,
  ProgressBar,
  ProgressRing,
  Screen,
  Skeleton,
  TabBar,
  Text,
  type ButtonSize,
  type ButtonVariant,
  type TabBarItem,
} from '@/components/ui';
import { ACCENT_KEYS, accents, useTheme, useThemedStyles, type ModePreference, type TextVariant } from '@/theme';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'soft', 'ghost', 'destructive'];
const SIZES: ButtonSize[] = ['lg', 'md', 'sm'];
const TEXT_VARIANTS: TextVariant[] = [
  'display',
  'title1',
  'title2',
  'title3',
  'body',
  'bodyStrong',
  'callout',
  'caption',
  'micro',
];
const MODES: { value: ModePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const TABS: TabBarItem[] = [
  { key: 'today', label: 'Today', icon: Sun },
  { key: 'plan', label: 'Plan', icon: CalendarDays },
  { key: 'progress', label: 'Progress', icon: ChartNoAxesColumn },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function GalleryRoute() {
  // Release builds: bounce back to the entry screen. The check is a constant,
  // so no hooks are skipped conditionally in practice.
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

function Gallery() {
  const theme = useTheme();
  const { mode, modePreference, accent, setModePreference, setAccent } = theme;

  // Local demo state for the interactive samples.
  const [tab, setTab] = useState('today');
  const [chipSelected, setChipSelected] = useState('Mon');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles((t) => ({
    // Vertical rhythm: sections are 32 apart, items inside a section 12 apart.
    page: { paddingTop: t.spacing[16], paddingBottom: t.spacing[48] },
    section: { marginTop: t.layout.sectionGap },
    sectionTitle: { marginBottom: t.spacing[12] },
    // Generic wrapping row for chips, swatches and button groups.
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing[12] },
    // Vertical stack with the standard gap between cards.
    stack: { gap: t.layout.cardGap },
    // Accent swatch: a 44 px tap target containing a 32 px colour dot.
    swatchHit: {
      width: t.layout.minTap,
      height: t.layout.minTap,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatch: { width: 32, height: 32, borderRadius: t.radius.pill },
    // The selected swatch gets a larger "halo" made of tonal space, not a border:
    // a 44 px muted circle behind the dot.
    swatchSelected: { backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.pill },
    // Inset block inside a card, using tone instead of divider lines.
    inset: { backgroundColor: t.colors.surfaceMuted, borderRadius: t.radius.sm, padding: t.spacing[16] },
    heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroText: { flex: 1, paddingRight: t.spacing[16] },
    // The tab bar preview sits on a bg-coloured area so its lift is visible.
    tabPreview: { paddingVertical: t.spacing[8] },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[12] },
    skeletonLines: { flex: 1, gap: t.spacing[8] },
  }));

  const section = (title: string, children: ReactNode) => (
    <View style={styles.section}>
      <Text variant="title2" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <Screen scroll contentStyle={styles.page}>
      <Text variant="title1">Design gallery</Text>
      <Text variant="callout" color="textSecondary">
        Resolved mode: {mode} · accent: {accent}
      </Text>

      {/* ---- Theme controls ---- */}
      {section(
        'Appearance',
        <View style={styles.stack}>
          <View style={styles.row}>
            {MODES.map((m) => (
              <Chip
                key={m.value}
                label={m.label}
                selected={modePreference === m.value}
                onPress={() => setModePreference(m.value)}
              />
            ))}
          </View>
          <View style={styles.row}>
            {ACCENT_KEYS.map((key) => {
              const selected = key === accent;
              return (
                <Pressable
                  key={key}
                  onPress={() => setAccent(key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${key} accent`}
                  accessibilityState={{ selected }}
                  style={[styles.swatchHit, selected && styles.swatchSelected]}
                >
                  {/* Preview colour of that accent in the current mode. */}
                  <View style={[styles.swatch, { backgroundColor: accents[key][mode].accent }]} />
                </Pressable>
              );
            })}
          </View>
        </View>,
      )}

      {/* ---- Hero (the only gradient on this screen) ---- */}
      {section(
        'Hero card',
        <HeroCard>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text variant="caption" color="onHero">
                Today
              </Text>
              <Text variant="display" color="onHero" tabular>
                3 of 5 done
              </Text>
              <Text variant="callout" color="onHero">
                Two to go. You are doing well.
              </Text>
            </View>
            <ProgressRing progress={0.6} onHero accessibilityLabel="3 of 5 habits completed">
              <Text variant="title3" color="onHero" tabular>
                60%
              </Text>
            </ProgressRing>
          </View>
        </HeroCard>,
      )}

      {/* ---- Type ---- */}
      {section(
        'Typography',
        <Card style={styles.stack}>
          {TEXT_VARIANTS.map((v) => (
            <Text key={v} variant={v}>
              {v} · Habits that stick
            </Text>
          ))}
          <Text variant="body" color="textSecondary">
            textSecondary · supporting text
          </Text>
          <Text variant="body" color="textTertiary">
            textTertiary · hints
          </Text>
          <Text variant="title2" tabular>
            Tabular 1111 vs 0000
          </Text>
        </Card>,
      )}

      {/* ---- Buttons ---- */}
      {section(
        'Buttons',
        <View style={styles.stack}>
          {VARIANTS.map((v) => (
            <View key={v} style={styles.row}>
              {SIZES.map((s) => (
                <Button key={s} label={`${v} ${s}`} variant={v} size={s} />
              ))}
            </View>
          ))}
          <View style={styles.row}>
            <Button label="With icon" icon={Plus} />
            <Button label="Delete" variant="destructive" icon={Trash2} />
            <Button label="Disabled" disabled />
          </View>
          <Button
            label="Tap to load for 2s"
            size="lg"
            fullWidth
            loading={loading}
            onPress={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 2000);
            }}
          />
        </View>,
      )}

      {/* ---- Chips and icon buttons ---- */}
      {section(
        'Chips and icon buttons',
        <View style={styles.stack}>
          <View style={styles.row}>
            {['Mon', 'Tue', 'Wed', 'Thu'].map((d) => (
              <Chip key={d} label={d} selected={chipSelected === d} onPress={() => setChipSelected(d)} />
            ))}
            <Chip label="Compact" compact />
            <Chip label="With icon" icon={Sun} selected />
          </View>
          <View style={styles.row}>
            <IconButton icon={Plus} accessibilityLabel="Add habit" />
            <IconButton icon={Settings} accessibilityLabel="Settings" variant="raised" />
            <IconButton icon={Trash2} accessibilityLabel="Delete" disabled />
          </View>
        </View>,
      )}

      {/* ---- Inputs ---- */}
      {section(
        'Inputs',
        <Card style={styles.stack}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input label="Password" placeholder="At least 8 characters" secureTextEntry />
          <Input label="With error" value="not-an-email" error="Enter a valid email address" />
        </Card>,
      )}

      {/* ---- Progress ---- */}
      {section(
        'Progress',
        <Card style={styles.stack}>
          <View style={styles.row}>
            <ProgressRing progress={0.25} size={72} accessibilityLabel="1 of 4 habits completed" />
            <ProgressRing progress={0.6} accessibilityLabel="3 of 5 habits completed">
              <Text variant="title3" tabular>
                3/5
              </Text>
            </ProgressRing>
            <ProgressRing progress={1} size={72} accessibilityLabel="All habits completed" />
          </View>
          <ProgressBar progress={0.4} accessibilityLabel="40 percent of the week completed" />
          <ProgressBar progress={0.85} accessibilityLabel="85 percent of the week completed" />
        </Card>,
      )}

      {/* ---- Skeleton ---- */}
      {section(
        'Skeleton',
        <Card style={styles.skeletonRow}>
          <Skeleton width={28} height={28} radius={14} />
          <View style={styles.skeletonLines}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="35%" height={12} />
          </View>
        </Card>,
      )}

      {/* ---- Cards ---- */}
      {section(
        'Cards',
        <View style={styles.stack}>
          <Card>
            <Text variant="title3">Default card</Text>
            <Text variant="callout" color="textSecondary">
              Surface fill, large corners, soft shadow, 20 padding.
            </Text>
            <View style={[styles.inset, { marginTop: 16 }]}>
              <Text variant="caption" color="textSecondary">
                Inset block (surfaceMuted) instead of a divider line
              </Text>
            </View>
          </Card>
          <Card compact>
            <Text variant="title3">Compact card</Text>
            <Text variant="callout" color="textSecondary">
              16 padding.
            </Text>
          </Card>
        </View>,
      )}

      {/* ---- Tab bar (non-floating preview) ---- */}
      {section(
        'Tab bar',
        <View style={styles.tabPreview}>
          <TabBar items={TABS} activeKey={tab} onSelect={setTab} floating={false} />
        </View>,
      )}
    </Screen>
  );
}
