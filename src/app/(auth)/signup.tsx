/**
 * src/app/(auth)/signup.tsx
 *
 * Create account (POST /auth/signup, JSON), then log in straight away
 * (POST /auth/login) so the user lands in onboarding without retyping.
 *
 * Errors, all through the central mapping in src/api/errors.ts:
 *  - 422 -> messages under the matching fields
 *  - 409 -> "An account with this email already exists" + "Log in instead"
 *  - network / timeout / 5xx -> generic message
 * If the account was created but the automatic login fails, the user goes to
 * the login screen with the email filled in and a short note.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { isApiError, mapApiError, type ApiError } from '@/api/errors';
import { Notice } from '@/components/layout/Notice';
import { Button, Input, Text, type InputHandle } from '@/components/ui';
import { login, signup } from '@/features/auth/api';
import { AuthScaffold } from '@/features/auth/components/AuthScaffold';
import { signupSchema, splitFieldErrors, type SignupValues } from '@/features/auth/forms';
import { sessionSignedIn } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

export default function SignupScreen() {
  const router = useRouter();
  const emailRef = useRef<InputHandle>(null);
  const passwordRef = useRef<InputHandle>(null);
  // The current non-field error, kept whole so a 409 can offer "Log in instead".
  const [formError, setFormError] = useState<{ message: string; emailTaken: boolean } | null>(null);

  const { control, handleSubmit, setError, getValues, formState } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const styles = useThemedStyles((t) => ({
    // Primary button gets a bit more space above it than between fields.
    submit: { marginTop: t.spacing[8] },
    // Footer: prompt and link on one line, centred.
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[4] },
  }));

  const goToLogin = (params?: { created?: '1' }) =>
    router.replace({ pathname: '/login', params: { email: getValues('email').trim(), ...params } });

  const showError = (apiError: ApiError) => {
    if (apiError.kind === 'validation') {
      const { fields, formMessage } = splitFieldErrors(apiError, {
        display_name: 'displayName',
        email: 'email',
        password: 'password',
      });
      if (fields.displayName) setError('displayName', { message: fields.displayName });
      if (fields.email) setError('email', { message: fields.email });
      if (fields.password) setError('password', { message: fields.password });
      setFormError(formMessage ? { message: formMessage, emailTaken: false } : null);
      return;
    }
    setFormError({ message: apiError.message, emailTaken: apiError.operation === 'signup' && apiError.kind === 'conflict' });
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const email = values.email.trim();
    // A blank name is sent as null (the server would turn "" into null anyway).
    const displayName = values.displayName.trim() || null;

    try {
      await signup({ email, password: values.password, display_name: displayName });
    } catch (error) {
      showError(isApiError(error) ? error : mapApiError({ operation: 'signup', cause: error }));
      return;
    }

    try {
      await login(email, values.password);
    } catch {
      // The account exists now; let the user log in by hand.
      goToLogin({ created: '1' });
      return;
    }
    await sessionSignedIn();
  });

  return (
    <AuthScaffold
      title="Create your account"
      subtitle="Next, a few questions to shape your plan"
      footer={
        <View style={styles.footerRow}>
          <Text variant="callout" color="textSecondary">
            Already have an account?
          </Text>
          <Button label="Log in" variant="ghost" size="sm" onPress={() => goToLogin()} />
        </View>
      }
    >
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <Input
            label="Name (optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            submitBehavior="submit"
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            ref={emailRef}
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Input
            ref={passwordRef}
            label="Password"
            placeholder="At least 8 characters"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      {formError ? (
        <Notice message={formError.message}>
          {formError.emailTaken ? (
            <Button label="Log in instead" variant="secondary" size="sm" onPress={() => goToLogin()} />
          ) : null}
        </Notice>
      ) : null}

      <Button
        label="Create account"
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
        style={styles.submit}
      />
    </AuthScaffold>
  );
}
