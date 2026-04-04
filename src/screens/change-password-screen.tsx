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

type ChangePasswordValues = {
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
};

type ChangePasswordErrors = Partial<Record<keyof ChangePasswordValues, string>>;

type ChangePasswordScreenProps = {
  email: string;
  onChangePassword: (payload: {
    currentPassword: string;
    nextPassword: string;
  }) => Promise<AuthActionResult>;
  onBack: () => void;
};

const initialValues: ChangePasswordValues = {
  currentPassword: '',
  nextPassword: '',
  confirmPassword: '',
};

const securityTips = ['Поточний пароль', 'Новий пароль', 'Підтвердження'];

export function ChangePasswordScreen({
  email,
  onChangePassword,
  onBack,
}: ChangePasswordScreenProps) {
  const [values, setValues] = useState<ChangePasswordValues>(initialValues);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
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

  const isSubmitDisabled = useMemo(() => {
    return (
      !values.currentPassword.trim() ||
      !values.nextPassword.trim() ||
      !values.confirmPassword.trim() ||
      isSubmitting
    );
  }, [isSubmitting, values.confirmPassword, values.currentPassword, values.nextPassword]);

  const handleChange = (field: keyof ChangePasswordValues) => (value: string) => {
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
    const nextErrors: ChangePasswordErrors = {};
    const currentPassword = values.currentPassword.trim();
    const nextPassword = values.nextPassword.trim();
    const confirmPassword = values.confirmPassword.trim();

    if (!currentPassword) {
      nextErrors.currentPassword = 'Введіть поточний пароль.';
    }

    if (!nextPassword) {
      nextErrors.nextPassword = 'Введіть новий пароль.';
    } else if (nextPassword.length < 6) {
      nextErrors.nextPassword = 'Пароль має містити щонайменше 6 символів.';
    } else if (nextPassword === currentPassword) {
      nextErrors.nextPassword = 'Новий пароль має відрізнятися від поточного.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Підтвердьте новий пароль.';
    } else if (confirmPassword !== nextPassword) {
      nextErrors.confirmPassword = 'Паролі не співпадають.';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setMessageTone('error');
      setMessage('Не вдалося змінити пароль. Перевірте форму.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onChangePassword({
        currentPassword: values.currentPassword.trim(),
        nextPassword: values.nextPassword.trim(),
      });

      if (!result.ok) {
        setMessageTone('error');
        setMessage(result.message ?? 'Не вдалося змінити пароль.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordTip = () => {
    setMessageTone('neutral');
    setMessage('Після зміни пароля ви залишитесь у своєму кабінеті, а нові дані одразу стануть активними.');
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
              <BrandMark subtitle="керування безпекою профілю" />

              <Text style={styles.headerTitle}>Оновіть пароль свого акаунта</Text>
              <Text style={styles.headerSubtitle}>
                Зараз ви працюєте як {email}. Підтвердьте поточний пароль і задайте новий для цього профілю.
              </Text>

              <View style={styles.tipsRow}>
                {securityTips.map((item) => (
                  <View key={item} style={styles.tipChip}>
                    <Text style={styles.tipText}>{item}</Text>
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
              <Text style={styles.formTitle}>Зміна паролю</Text>
              <Text style={styles.formSubtitle}>
                Для безпеки потрібно ввести поточний пароль, а потім двічі повторити новий.
              </Text>

              <TextField
                label="Поточний пароль"
                value={values.currentPassword}
                onChangeText={handleChange('currentPassword')}
                placeholder="Введіть поточний пароль"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.currentPassword}
              />

              <TextField
                label="Новий пароль"
                value={values.nextPassword}
                onChangeText={handleChange('nextPassword')}
                placeholder="Не менше 6 символів"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.nextPassword}
              />

              <TextField
                label="Підтвердження нового пароля"
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                placeholder="Повторіть новий пароль"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
              />

              <PrimaryButton
                title={isSubmitting ? 'Збереження...' : 'Зберегти новий пароль'}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
              />

              <View style={styles.actionsRow}>
                <Pressable onPress={onBack}>
                  <Text style={styles.linkText}>Назад до кабінету</Text>
                </Pressable>
                <Pressable onPress={handlePasswordTip}>
                  <Text style={styles.linkText}>Що буде далі?</Text>
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
  tipsRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tipChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tipText: {
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
