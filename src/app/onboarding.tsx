/**
 * src/app/onboarding.tsx
 *
 * PLACEHOLDER for Milestone 3 (step-by-step onboarding wizard). The startup
 * gate routes here when GET /onboarding/me returns 404. In development builds
 * a logout button is included so a test account is never stuck here.
 */

import { ClipboardList } from 'lucide-react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { Button, Screen } from '@/components/ui';
import { signOut } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

export default function OnboardingPlaceholder() {
  const styles = useThemedStyles(() => ({
    // Empty state centred vertically on the screen.
    content: { justifyContent: 'center' },
  }));

  return (
    <Screen contentStyle={styles.content}>
      <EmptyState
        icon={ClipboardList}
        title="Set up your plan"
        message="The onboarding questions arrive in the next milestone."
      >
        {__DEV__ ? (
          <Button label="Log out" variant="secondary" size="lg" fullWidth onPress={() => void signOut()} />
        ) : null}
      </EmptyState>
    </Screen>
  );
}
