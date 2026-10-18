import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { FormGroup } from '@ui/components/FormGroup';
import { Input } from '@ui/components/Input';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signInSchema } from './schema';
import { signInErrorMessage } from './signInError';
import { styles } from './styles';

export function SignIn() {
  const { top, bottom } = useSafeAreaInsets();
  const { signIn } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      await signIn(data);
    } catch (error) {
      setSubmitError(signInErrorMessage(error));
    }
  });

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Entrar" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <AppText size="3xl" weight="semiBold" style={styles.heading}>
            Acesse a sua conta
          </AppText>

          <View style={styles.form}>
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormGroup label="E-mail" error={fieldState.error?.message}>
                  <Input
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    value={field.value}
                    onChangeText={field.onChange}
                    disabled={form.formState.isSubmitting}
                  />
                </FormGroup>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormGroup label="Senha" error={fieldState.error?.message}>
                  <Input
                    ref={passwordInputRef}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    value={field.value}
                    onChangeText={field.onChange}
                    disabled={form.formState.isSubmitting}
                  />
                </FormGroup>
              )}
            />

            {submitError && (
              <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
                {submitError}
              </AppText>
            )}

            <Button
              onPress={handleSubmit}
              isLoading={form.formState.isSubmitting}
              style={styles.submit}
            >
              Entrar
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
