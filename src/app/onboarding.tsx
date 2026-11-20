/**
 * src/app/onboarding.tsx
 *
 * The onboarding wizard (brief: Onboarding; design doc 7: one question per
 * screen, `display` heading, card or chip choices, progress dots in accent).
 * The startup gate opens this screen when GET /onboarding/me returns 404.
 *
 *   [back]      ● ━━ ○ ○ ○             (dev: Log out)
 *   What's your main goal?             display
 *   Your weekly plan is built around it
 *   ...the step's answer UI...         scrolls
 *   [error notice]                     only after a failed save
 *   [ Continue / Finish setup ]        pinned to the bottom
 *
 * How it works:
 *  - ONE react-hook-form instance holds every answer, so moving back and forth
 *    (button or Android back) never loses anything.
 *  - "Continue" validates only the current step's fields (wizard.ts lists them).
 *  - "Finish setup" sends PUT /onboarding/me (save_my_profile) with every field,
 *    including the device time zone. A 422 puts the server's messages next to
 *    the matching fields and jumps to the first step that has one. Offline,
 *    timeout and 5xx show a notice (Finish setup tries again); the global "Waking up the server..."
 *    toast covers a slow cold start, and the button keeps its spinner.
 *  - On success the gate continues (plan check), then the tabs open.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useReducer, useState } from 'react';
import {
  Controller,
  useController,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormClearErrors,
} from 'react-hook-form';
import { BackHandler, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiClient } from '@/api/client';
import { isApiError, mapApiError, unwrap, type ApiError } from '@/api/errors';
import { CopyDebugInfo } from '@/components/layout/CopyDebugInfo';
import { Notice } from '@/components/layout/Notice';
import { Button, IconButton, Text } from '@/components/ui';
import { splitFieldErrors } from '@/features/auth/forms';
import { onboardingCompleted, signOut } from '@/features/auth/session';
import { ChoiceList } from '@/features/onboarding/components/ChoiceList';
import { EquipmentStep } from '@/features/onboarding/components/EquipmentStep';
import { ProgressDots } from '@/features/onboarding/components/ProgressDots';
import { ReminderStep } from '@/features/onboarding/components/ReminderStep';
import { DIETARY_PREF_LABELS, FITNESS_LEVEL_LABELS, GOAL_LABELS } from '@/features/onboarding/labels';
import { PROFILE_FIELD_MAP, toProfileRequest } from '@/features/onboarding/request';
import {
  defaultOnboardingValues,
  onboardingSchema,
  type OnboardingField,
  type OnboardingInput,
  type OnboardingValues,
} from '@/features/onboarding/schema';
import {
  firstStepWithError,
  initialWizardState,
  isFirstStep,
  isLastStep,
  ONBOARDING_STEPS,
  STEP_COUNT,
  wizardReducer,
} from '@/features/onboarding/wizard';
import { deviceTimeZone } from '@/lib/timezone';
import { useThemedStyles } from '@/theme';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [wizard, dispatch] = useReducer(wizardReducer, initialWizardState);
  // A save that failed for a non-field reason (offline, timeout, 5xx...).
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  // A 422 message that matched no field.
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const { control, handleSubmit, trigger, setError, clearErrors, formState } = useForm<
    OnboardingInput,
    unknown,
    OnboardingValues
  >({
    resolver: zodResolver(onboardingSchema),
    // The device time zone is read once, when the form is created.
    defaultValues: defaultOnboardingValues(deviceTimeZone()),
  });

  const step = ONBOARDING_STEPS[wizard.index]!;
  const last = isLastStep(wizard);
  const busy = formState.isSubmitting;

  // Android back button: previous question first; leave the app only from step 1.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFirstStep(wizard) || busy) return busy;
      dispatch({ type: 'back' });
      return true;
    });
    return () => sub.remove();
  }, [wizard, busy]);

  const styles = useThemedStyles((t) => ({
    // Fills the screen so the keyboard (equipment step) can shrink it.
    flex: { flex: 1, backgroundColor: t.colors.bg },
    // Top bar: back button, dots and the optional dev action in three slots.
    // The two side slots share the free width equally so the dots stay
    // centred whatever sits on either side.
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: t.layout.minTap,
      marginTop: t.spacing[8],
      paddingHorizontal: t.layout.screenPadding,
    },
    side: { flex: 1, flexDirection: 'row' },
    sideEnd: { justifyContent: 'flex-end' },
    // Scrollable middle: the question and its answers, with screen padding.
    // A section gap under the top bar, and 24 at the end so the last item
    // does not touch the pinned footer.
    scrollContent: {
      paddingHorizontal: t.layout.screenPadding,
      paddingTop: t.layout.sectionGap,
      paddingBottom: t.spacing[24],
    },
    // Question block: display heading, 8 px to the subtitle, a section gap to the answers.
    title: { marginBottom: t.spacing[8] },
    header: { marginBottom: t.layout.sectionGap },
    // Pinned footer: screen padding at the sides, 16 above the home indicator
    // (added to the safe-area inset below), 12 between the notice and button.
    footer: { paddingHorizontal: t.layout.screenPadding, paddingTop: t.spacing[8], gap: t.spacing[12] },
  }));

  /** After a failed submit (client or server), show the first step with an error. */
  const jumpToErrors = (fields: readonly OnboardingField[]) => {
    const index = firstStepWithError(fields);
    if (index !== null) dispatch({ type: 'goTo', index });
  };

  const save = handleSubmit(
    async (values) => {
      setSaveError(null);
      setFormMessage(null);
      try {
        await unwrap('save_my_profile', apiClient.PUT('/onboarding/me', { body: toProfileRequest(values) }));
      } catch (error) {
        const apiError = isApiError(error) ? error : mapApiError({ operation: 'save_my_profile', cause: error });
        // The client has already cleared the tokens; the session store routes to login.
        if (apiError.kind === 'sessionExpired') return;
        if (apiError.kind === 'validation') {
          const { fields, formMessage: leftover } = splitFieldErrors(apiError, PROFILE_FIELD_MAP);
          const named = Object.keys(fields) as OnboardingField[];
          for (const field of named) setError(field, { message: fields[field] });
          setFormMessage(leftover);
          jumpToErrors(named);
          return;
        }
        setSaveError(apiError);
        return;
      }
      // Saved: continue the startup gate (plan check). The spinner stays on
      // until the tabs open.
      await onboardingCompleted();
    },
    (errors: FieldErrors<OnboardingInput>) => jumpToErrors(Object.keys(errors) as OnboardingField[]),
  );

  const onPrimary = async () => {
    if (last) {
      await save();
      return;
    }
    // Only the current question is checked before moving on.
    if (await trigger(step.fields as OnboardingField[])) dispatch({ type: 'next' });
  };

  const renderStep = () => {
    switch (step.id) {
      case 'goal':
        return (
          <Controller
            control={control}
            name="goal"
            render={({ field, fieldState }) => (
              <ChoiceList
                options={GOAL_LABELS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  clearErrors('goal');
                }}
                accessibilityLabel="Goal"
                error={fieldState.error?.message}
              />
            )}
          />
        );
      case 'fitness':
        return (
          <Controller
            control={control}
            name="fitnessLevel"
            render={({ field, fieldState }) => (
              <ChoiceList
                options={FITNESS_LEVEL_LABELS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  clearErrors('fitnessLevel');
                }}
                accessibilityLabel="Fitness level"
                error={fieldState.error?.message}
              />
            )}
          />
        );
      case 'diet':
        return (
          <Controller
            control={control}
            name="dietaryPref"
            render={({ field, fieldState }) => (
              <ChoiceList
                options={DIETARY_PREF_LABELS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  clearErrors('dietaryPref');
                }}
                accessibilityLabel="Dietary preference"
                error={fieldState.error?.message}
              />
            )}
          />
        );
      case 'equipment':
        return (
          <Controller
            control={control}
            name="equipment"
            render={({ field, fieldState }) => (
              <EquipmentStep
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  clearErrors('equipment');
                }}
                // zod reports per-item problems on "equipment.N"; show the first one.
                error={fieldState.error?.message ?? firstItemError(formState.errors.equipment)}
              />
            )}
          />
        );
      case 'reminders':
        return <ReminderFields control={control} clearErrors={clearErrors} />;
    }
  };

  return (
    // 'padding' on both platforms, as on the auth screens (Android is edge-to-edge).
    <KeyboardAvoidingView behavior="padding" style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          {!isFirstStep(wizard) ? (
            <IconButton
              icon={ChevronLeft}
              accessibilityLabel="Previous question"
              onPress={() => dispatch({ type: 'back' })}
              disabled={busy}
            />
          ) : null}
        </View>
        <ProgressDots current={wizard.index} total={STEP_COUNT} />
        <View style={[styles.side, styles.sideEnd]}>
          {/* Development builds only: a way out for test accounts. */}
          {__DEV__ ? <Button label="Log out" variant="ghost" size="sm" onPress={() => void signOut()} /> : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Keyed by step: each question fades in (250 ms, design doc 8),
            or simply appears when the OS asks for reduced motion. */}
        <Animated.View key={step.id} entering={FadeIn.duration(250).reduceMotion(ReduceMotion.System)}>
          <View style={styles.header}>
            <Text variant="display" accessibilityRole="header" style={styles.title}>
              {step.title}
            </Text>
            <Text variant="callout" color="textSecondary">
              {step.subtitle}
            </Text>
          </View>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {saveError ? (
          <Notice title="Your answers were not saved" message={saveError.message}>
            {saveError.kind === 'server' || saveError.kind === 'unexpected' ? <CopyDebugInfo /> : null}
          </Notice>
        ) : null}
        {formMessage ? <Notice message={formMessage} /> : null}
        <Button
          label={last ? 'Finish setup' : 'Continue'}
          size="lg"
          fullWidth
          loading={busy}
          onPress={() => void onPrimary()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * The reminders step's three fields (switch, time, time zone), each bound to
 * the form with useController. Errors come from each field's own state.
 */
function ReminderFields({
  control,
  clearErrors,
}: {
  control: Control<OnboardingInput, unknown, OnboardingValues>;
  clearErrors: UseFormClearErrors<OnboardingInput>;
}) {
  const enabled = useController({ control, name: 'remindersEnabled' });
  const time = useController({ control, name: 'reminderTime' });
  const zone = useController({ control, name: 'timezone' });

  return (
    <ReminderStep
      enabled={enabled.field.value}
      onEnabledChange={(v) => {
        enabled.field.onChange(v);
        clearErrors('remindersEnabled');
      }}
      time={time.field.value}
      onTimeChange={(v) => {
        time.field.onChange(v);
        clearErrors('reminderTime');
      }}
      timezone={zone.field.value}
      errors={{
        enabled: enabled.fieldState.error?.message,
        time: time.fieldState.error?.message,
        timezone: zone.fieldState.error?.message,
      }}
    />
  );
}

/** The first message from zod's per-item array errors, if any. */
function firstItemError(error: unknown): string | undefined {
  if (!Array.isArray(error)) return undefined;
  for (const item of error) {
    if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') {
      return item.message;
    }
  }
  return undefined;
}
