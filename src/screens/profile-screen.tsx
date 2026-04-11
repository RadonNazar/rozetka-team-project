import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { loadUserProfile, saveUserProfile } from '../storage/profile-storage';
import { colors } from '../theme/colors';
import type { UserProfile } from '../types/auth';

type ProfileValues = {
  fullName: string;
  phone: string;
  city: string;
};

type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

type ProfileScreenProps = {
  email: string;
  onBack: () => void;
  onSaved: (message: string) => void;
};

const profilePoints = ['Контакти', 'Місто доставки', 'Особисті дані'];

function capitalizeWord(word: string) {
  if (!word) {
    return '';
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function buildDefaultFullName(email: string) {
  const emailName = email.split('@')[0] ?? '';
  const parts = emailName
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(capitalizeWord);

  return parts.join(' ') || 'Покупець Rozetka';
}

function buildDefaultValues(email: string): ProfileValues {
  return {
    fullName: buildDefaultFullName(email),
    phone: '',
    city: 'Київ',
  };
}

function normalizePhone(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const normalized = trimmedValue.replace(/[^\d+]/g, '');

  if (normalized.startsWith('+')) {
    return `+${normalized.slice(1).replace(/\D/g, '')}`;
  }

  return normalized.replace(/\D/g, '');
}

export function ProfileScreen({ email, onBack, onSaved }: ProfileScreenProps) {
  const [values, setValues] = useState<ProfileValues>(() => buildDefaultValues(email));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'neutral' | 'error'>('neutral');
  const [isHydrating, setIsHydrating] = useState(true);
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
    let isMounted = true;

    const hydrateProfile = async () => {
      const storedProfile = await loadUserProfile(email);

      if (!isMounted) {
        return;
      }

      setValues(
        storedProfile
          ? {
              fullName: storedProfile.fullName,
              phone: storedProfile.phone,
              city: storedProfile.city,
            }
          : buildDefaultValues(email)
      );
      setIsHydrating(false);
    };

    void hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [email]);

  const isSubmitDisabled = useMemo(() => {
    return !values.fullName.trim() || !values.phone.trim() || !values.city.trim() || isSubmitting;
  }, [isSubmitting, values.city, values.fullName, values.phone]);

  const handleChange = (field: keyof ProfileValues) => (value: string) => {
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
    const nextErrors: ProfileErrors = {};
    const normalizedName = values.fullName.trim();
    const normalizedPhone = normalizePhone(values.phone);
    const normalizedCity = values.city.trim();

    if (!normalizedName) {
      nextErrors.fullName = "Вкажіть ім'я та прізвище.";
    } else if (normalizedName.length < 2) {
      nextErrors.fullName = "Ім'я має містити щонайменше 2 символи.";
    }

    if (!normalizedPhone) {
      nextErrors.phone = 'Вкажіть номер телефону.';
    } else if (!/^\+?\d{10,13}$/.test(normalizedPhone)) {
      nextErrors.phone = 'Перевірте формат телефону.';
    }

    if (!normalizedCity) {
      nextErrors.city = 'Вкажіть місто.';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setMessageTone('error');
      setMessage('Не вдалося зберегти профіль. Перевірте форму.');
      return;
    }

    setIsSubmitting(true);

    try {
      const existingProfile = await loadUserProfile(email);
      const nextProfile: UserProfile = {
        email: email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        phone: normalizePhone(values.phone),
        city: values.city.trim(),
        novaPoshta: existingProfile?.novaPoshta,
        updatedAt: new Date().toISOString(),
      };

      await saveUserProfile(nextProfile);
      onSaved('Дані профілю збережено. Контактна інформація користувача оновлена.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileTip = () => {
    setMessageTone('neutral');
    setMessage('Ці дані зберігаються локально в застосунку і підготують основу для доставки та оформлення замовлень.');
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
              <BrandMark subtitle="профіль користувача" />

              <Text style={styles.headerTitle}>Керуйте особистими даними</Text>
              <Text style={styles.headerSubtitle}>
                Заповніть базову інформацію про себе, щоб наступні модулі кошика й замовлень уже мали готовий профіль покупця.
              </Text>

              <View style={styles.pointsRow}>
                {profilePoints.map((item) => (
                  <View key={item} style={styles.pointChip}>
                    <Text style={styles.pointText}>{item}</Text>
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
              <Text style={styles.formTitle}>Мій профіль</Text>
              <Text style={styles.formSubtitle}>
                Email фіксований для акаунта, а решту контактних даних можна оновлювати.
              </Text>

              <View style={styles.emailCard}>
                <Text style={styles.emailLabel}>Email акаунта</Text>
                <Text style={styles.emailValue}>{email}</Text>
              </View>

              {isHydrating ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : (
                <>
                  <TextField
                    label="Ім'я та прізвище"
                    value={values.fullName}
                    onChangeText={handleChange('fullName')}
                    placeholder="Наприклад, Nazar Radon"
                    autoCapitalize="words"
                    autoCorrect={false}
                    error={errors.fullName}
                  />

                  <TextField
                    label="Телефон"
                    value={values.phone}
                    onChangeText={handleChange('phone')}
                    placeholder="+380XXXXXXXXX"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.phone}
                  />

                  <TextField
                    label="Місто"
                    value={values.city}
                    onChangeText={handleChange('city')}
                    placeholder="Київ"
                    autoCapitalize="words"
                    autoCorrect={false}
                    error={errors.city}
                  />

                  <PrimaryButton
                    title={isSubmitting ? 'Збереження...' : 'Зберегти профіль'}
                    onPress={handleSubmit}
                    disabled={isSubmitDisabled}
                  />
                </>
              )}

              <View style={styles.actionsRow}>
                <Pressable onPress={onBack}>
                  <Text style={styles.linkText}>Назад до кабінету</Text>
                </Pressable>
                <Pressable onPress={handleProfileTip}>
                  <Text style={styles.linkText}>Для чого це?</Text>
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
  pointsRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pointChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pointText: {
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
  emailCard: {
    marginBottom: 18,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  emailValue: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.textDark,
  },
  loaderWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
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
