/**
 * src/app/(auth)/login.tsx
 *
 * Email + password login (POST /auth/login, form-encoded, email in `username`).
 *
 * Errors, all through the central mapping in src/api/errors.ts:
 *  - 422 -> messages under the matching fields (`username` maps to Email)
 *  - 401 -> "Incorrect email or password" (never says which one)
 *  - 429 -> "Too many attempts, try again later"
 *  - network / timeout / 5xx -> generic message, the user can just tap again
 *
 * On success the tokens are already in SecureStore; the session gate re-runs
 * and the router moves to onboarding or the tabs on its own.
 *
 * Route params (optional): `email` to prefill, `created=1` after a signup
 * whose automatic login did not go through.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { isApiError, mapApiError } from '@/api/errors';
import { Notice } from '@/components/layout/Notice';
import { Button, Input, Text, type InputHandle } from '@/components/ui';
import { login } from '@/features/auth/api';
import { AuthScaffold } from '@/features/auth/components/AuthScaffold';
import { loginSchema, splitFieldErrors, type LoginValues } from '@/features/auth/forms';
import { sessionSignedIn } from '@/features/auth/session';
import { useThemedStyles } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; created?: string }>();
  const passwordRef = useRef<InputHandle>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: params.email ?? '', password: '' },
  });

  const styles = useThemedStyles((t) => ({
    // Primary button gets a bit more space above it than between fields.
    submit: { marginTop: t.spacing[8] },
    // Footer: prompt and link on one line, centred.
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[4] },
  }));

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email.trim(), values.password);
      await sessionSignedIn();
    } catch (error) {
      const apiError = isApiError(error) ? error : mapApiError({ operation: 'login', cause: error });
      if (apiError.kind === 'validation') {
        const { fields, formMessage } = splitFieldErrors(apiError, { username: 'email', password: 'password' });
        if (fields.email) setError('email', { message: fields.email });
        if (fields.password) setError('password', { message: fields.password });
        setFormError(formMessage);
      } else {
        setFormError(apiError.message);
      }
    }
  });

  return (
    <AuthScaffold
      title="Log in"
      subtitle="Pick up your plan where you left it"
      footer={
        <View style={styles.footerRow}>
          <Text variant="callout" color="textSecondary">
            New here?
          </Text>
          <Button label="Create an account" variant="ghost" size="sm" onPress={() => router.replace('/signup')} />
        </View>
      }
    >
      {params.created === '1' && !formError ? (
        <Notice tone="neutral" message="Your account is ready. Log in to continue." />
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
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
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      {formError ? <Notice message={formError} /> : null}

      <Button
        label="Log in"
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
        style={styles.submit}
      />
    </AuthScaffold>
  );
}
