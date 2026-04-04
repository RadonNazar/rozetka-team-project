import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/brand-mark';
import { PrimaryButton } from '../components/primary-button';
import { TextField } from '../components/text-field';
import { colors } from '../theme/colors';
import type { AuthActionResult } from '../types/auth';

type RegisterValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

type RegisterScreenProps = {
  initialEmail?: string;
  onRegister: (credentials: { email: string; password: string }) => Promise<AuthActionResult>;
  onOpenLogin: () => void;
};

const initialValues: RegisterValues = {
  email: '',
  password: '',
  confirmPassword: '',
};

const promises = ['Швидке оформлення', 'Історія замовлень', 'Персональні пропозиції'];

export function RegisterScreen({
  initialEmail = '',
  onRegister,
  onOpenLogin,
}: RegisterScreenProps) {
  const [values, setValues] = useState<RegisterValues>({
    ...initialValues,
    email: initialEmail,
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'neutral' | 'error'>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroShift = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(heroShift, {
        toValue: 0,
        damping: 17,
        stiffness: 135,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroOpacity, heroShift]);

  useEffect(() => {
    setValues((current) => ({
      ...current,
      email: current.email || initialEmail,
    }));
  }, [initialEmail]);

  const isSubmitDisabled = useMemo(() => {
    return (
      !values.email.trim() ||
      !values.password.trim() ||
      !values.confirmPassword.trim() ||
      isSubmitting
    );
  }, [isSubmitting, values.confirmPassword, values.email, values.password]);

  const handleChange = (field: keyof RegisterValues) => (value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setMessage('');
  };

  const validate = () => {
    const nextErrors: RegisterErrors = {};
    const normalizedEmail = values.email.trim().toLowerCase();
    const normalizedPassword = values.password.trim();
    const normalizedConfirm = values.confirmPassword.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Введіть email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Перевірте формат email.';
    }

    if (!normalizedPassword) {
      nextErrors.password = 'Введіть пароль.';
    } else if (normalizedPassword.length < 6) {
      nextErrors.password = 'Пароль має містити щонайменше 6 символів.';
    }

    if (!normalizedConfirm) {
      nextErrors.confirmPassword = 'Підтвердьте пароль.';
    } else if (normalizedConfirm !== normalizedPassword) {
      nextErrors.confirmPassword = 'Паролі не співпадають.';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setMessageTone('error');
      setMessage('Не вдалося завершити реєстрацію. Перевірте форму.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onRegister({
        email: values.email.trim().toLowerCase(),
        password: values.password.trim(),
      });

      if (!result.ok) {
        setMessageTone('error');
        setMessage(result.message ?? 'Не вдалося створити акаунт.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHaveAccount = () => {
    setMessageTone('neutral');
    setMessage('Якщо акаунт уже створено, можна перейти на екран входу.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}>
        <View style={styles.background}>
          <View style={styles.topBand} />
          <View style={styles.topHalo} />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[
                styles.headerCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <BrandMark subtitle="створення нового акаунта" />

              <Text style={styles.headerTitle}>Створіть акаунт у Rozetka</Text>
              <Text style={styles.headerSubtitle}>
                Після реєстрації ви зможете швидше оформлювати покупки і керувати історією замовлень.
              </Text>

              <View style={styles.promisesRow}>
                {promises.map((item) => (
                  <View key={item} style={styles.promiseChip}>
                    <Text style={styles.promiseText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <Text style={styles.formTitle}>Реєстрація</Text>
              <Text style={styles.formSubtitle}>
                Заповніть email, пароль і підтвердження пароля, щоб створити новий акаунт.
              </Text>

              <TextField
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                placeholder="example@gmail.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                error={errors.email}
              />

              <TextField
                label="Пароль"
                value={values.password}
                onChangeText={handleChange('password')}
                placeholder="Не менше 6 символів"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.password}
              />

              <TextField
                label="Підтвердження пароля"
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                placeholder="Повторіть пароль"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
              />

              <PrimaryButton
                title={isSubmitting ? 'Створення...' : 'Створити акаунт'}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
              />

              <View style={styles.actionsRow}>
                <Pressable onPress={handleHaveAccount}>
                  <Text style={styles.linkText}>Вже маєте акаунт?</Text>
                </Pressable>
                <Pressable onPress={onOpenLogin}>
                  <Text style={styles.linkText}>Увійти</Text>
                </Pressable>
              </View>

              {message ? (
                <View
                  style={[
                    styles.messageCard,
                    messageTone === 'error' ? styles.messageCardError : styles.messageCardNeutral,
                  ]}>
                  <Text
                    style={[
                      styles.messageText,
                      messageTone === 'error' && styles.messageTextError,
                    ]}>
                    {message}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  background: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: colors.panelStrong,
  },
  topHalo: {
    position: 'absolute',
    top: 26,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.halo,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerCard: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: colors.panel,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 12,
    },
  },
  headerTitle: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.textLight,
  },
  headerSubtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMutedLight,
  },
  promisesRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  promiseChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  promiseText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
  },
  formCard: {
    marginTop: 18,
    padding: 22,
    borderRadius: 28,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  formTitle: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    color: colors.textDark,
  },
  formSubtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMutedDark,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentDark,
  },
  messageCard: {
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  messageCardNeutral: {
    backgroundColor: colors.cardMuted,
    borderColor: colors.borderLight,
  },
  messageCardError: {
    backgroundColor: '#fff5f5',
    borderColor: '#efc5c5',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
    fontWeight: '600',
  },
  messageTextError: {
    color: colors.error,
  },
});
