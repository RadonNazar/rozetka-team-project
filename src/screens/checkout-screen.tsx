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
import {
  getNovaPoshtaPickupPoint,
  getNovaPoshtaPickupPoints,
  novaPoshtaDirectory,
} from '../data/nova-poshta';
import { calculateCartTotals, clearUserCart, ensureUserCart } from '../storage/cart-storage';
import { createUserOrder } from '../storage/orders-storage';
import { loadUserProfile, saveUserProfile } from '../storage/profile-storage';
import { colors } from '../theme/colors';
import type { UserProfile } from '../types/auth';
import type { UserCart } from '../types/cart';
import type { NovaPoshtaPickupKind } from '../types/delivery';
import type { PaymentMethod } from '../types/order';

type CheckoutScreenProps = {
  email: string;
  onBack: () => void;
  onPlaced: (message: string) => void;
};

type CheckoutValues = {
  fullName: string;
  phone: string;
  city: string;
  pickupKind: NovaPoshtaPickupKind;
  pickupPointId: string;
  comment: string;
  paymentMethod: PaymentMethod | '';
};

type CheckoutErrors = Partial<Record<keyof CheckoutValues | 'cart', string>>;

const checkoutPoints = ['Контакти', 'Нова пошта', 'Оплата', 'Підтвердження'];
const paymentOptions: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
}> = [
  {
    value: 'card',
    title: 'Карткою онлайн',
    description: 'Швидкий варіант для підтвердженого замовлення.',
  },
  {
    value: 'cash',
    title: 'При отриманні',
    description: 'Оплата після доставки або самовивозу.',
  },
  {
    value: 'installments',
    title: 'Частинами',
    description: 'Базова підготовка для майбутньої інтеграції.',
  },
];

const novaPoshtaPickupOptions: Array<{
  value: NovaPoshtaPickupKind;
  title: string;
  description: string;
}> = [
  {
    value: 'branch',
    title: 'Відділення',
    description: 'Класичне отримання у відділенні Нової пошти.',
  },
  {
    value: 'postomat',
    title: 'Поштомат',
    description: 'Швидке отримання в поштоматі, якщо зручно забрати без черги.',
  },
];

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

function formatNovaPoshtaPickupKind(value: NovaPoshtaPickupKind) {
  return value === 'postomat' ? 'Поштомат' : 'Відділення';
}

export function CheckoutScreen({ email, onBack, onPlaced }: CheckoutScreenProps) {
  const [cart, setCart] = useState<UserCart | null>(null);
  const [values, setValues] = useState<CheckoutValues>({
    fullName: buildDefaultFullName(email),
    phone: '',
    city: 'Київ',
    pickupKind: 'branch',
    pickupPointId: '',
    comment: '',
    paymentMethod: 'card',
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
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

    const hydrateCheckout = async () => {
      const [storedCart, storedProfile] = await Promise.all([
        ensureUserCart(email),
        loadUserProfile(email),
      ]);

      if (!isMounted) {
        return;
      }

      const defaultCity =
        storedProfile?.novaPoshta?.city || storedProfile?.city || novaPoshtaDirectory[0]?.city || 'Київ';
      const defaultPickupKind = storedProfile?.novaPoshta?.pickupKind ?? 'branch';
      const defaultPickupPoints = getNovaPoshtaPickupPoints(defaultCity, defaultPickupKind);
      const defaultPickupPointId =
        defaultPickupPoints.find((item) => item.id === storedProfile?.novaPoshta?.pickupPointId)?.id ??
        defaultPickupPoints[0]?.id ??
        '';

      setCart(storedCart);
      setValues({
        fullName: storedProfile?.fullName || buildDefaultFullName(email),
        phone: storedProfile?.phone || '',
        city: defaultCity,
        pickupKind: defaultPickupKind,
        pickupPointId: defaultPickupPointId,
        comment: '',
        paymentMethod: 'card',
      });
      setIsHydrating(false);
    };

    void hydrateCheckout();

    return () => {
      isMounted = false;
    };
  }, [email]);

  const totals = useMemo(() => calculateCartTotals(cart?.items ?? []), [cart?.items]);

  const availablePickupPoints = useMemo(() => {
    return getNovaPoshtaPickupPoints(values.city, values.pickupKind);
  }, [values.city, values.pickupKind]);

  const selectedPickupPoint = useMemo(() => {
    return getNovaPoshtaPickupPoint(values.city, values.pickupKind, values.pickupPointId);
  }, [values.city, values.pickupKind, values.pickupPointId]);

  useEffect(() => {
    if (!availablePickupPoints.length) {
      if (values.pickupPointId) {
        setValues((current) => ({
          ...current,
          pickupPointId: '',
        }));
      }
      return;
    }

    const currentPointStillAvailable = availablePickupPoints.some(
      (item) => item.id === values.pickupPointId
    );

    if (!currentPointStillAvailable) {
      setValues((current) => ({
        ...current,
        pickupPointId: availablePickupPoints[0]?.id ?? '',
      }));
    }
  }, [availablePickupPoints, values.pickupPointId]);

  const isSubmitDisabled = useMemo(() => {
    return (
      isHydrating ||
      isSubmitting ||
      !totals.itemsCount ||
      !values.fullName.trim() ||
      !values.phone.trim() ||
      !values.city.trim() ||
      !values.pickupPointId ||
      !values.paymentMethod
    );
  }, [
    isHydrating,
    isSubmitting,
    totals.itemsCount,
    values.city,
    values.fullName,
    values.pickupPointId,
    values.paymentMethod,
    values.phone,
  ]);

  const formattedSubtotal = `${totals.subtotal.toLocaleString('uk-UA')} грн`;

  const handleChange = (field: keyof CheckoutValues) => (value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
      cart: undefined,
    }));
    setMessage('');
  };

  const handleSelectCity = (city: string) => {
    setValues((current) => ({
      ...current,
      city,
    }));

    setErrors((current) => ({
      ...current,
      city: undefined,
      pickupPointId: undefined,
    }));
    setMessage('');
  };

  const handleSelectPickupKind = (pickupKind: NovaPoshtaPickupKind) => {
    setValues((current) => ({
      ...current,
      pickupKind,
    }));

    setErrors((current) => ({
      ...current,
      pickupPointId: undefined,
    }));
    setMessage('');
  };

  const handleSelectPickupPoint = (pickupPointId: string) => {
    setValues((current) => ({
      ...current,
      pickupPointId,
    }));

    setErrors((current) => ({
      ...current,
      pickupPointId: undefined,
    }));
    setMessage('');
  };

  const handleSelectPayment = (paymentMethod: PaymentMethod) => {
    setValues((current) => ({
      ...current,
      paymentMethod,
    }));

    setErrors((current) => ({
      ...current,
      paymentMethod: undefined,
    }));
    setMessage('');
  };

  const validate = () => {
    const nextErrors: CheckoutErrors = {};
    const normalizedName = values.fullName.trim();
    const normalizedPhone = normalizePhone(values.phone);
    const normalizedCity = values.city.trim();

    if (!cart?.items.length) {
      nextErrors.cart = 'Кошик порожній. Додайте товари перед оформленням.';
    }

    if (!normalizedName) {
      nextErrors.fullName = "Вкажіть ім'я та прізвище отримувача.";
    } else if (normalizedName.length < 2) {
      nextErrors.fullName = "Ім'я має містити щонайменше 2 символи.";
    }

    if (!normalizedPhone) {
      nextErrors.phone = 'Вкажіть номер телефону.';
    } else if (!/^\+?\d{10,13}$/.test(normalizedPhone)) {
      nextErrors.phone = 'Перевірте формат телефону.';
    }

    if (!normalizedCity) {
      nextErrors.city = 'Вкажіть місто отримувача.';
    }

    if (!values.pickupPointId || !selectedPickupPoint) {
      nextErrors.pickupPointId = 'Оберіть відділення або поштомат Нової пошти.';
    }

    if (!values.paymentMethod) {
      nextErrors.paymentMethod = 'Оберіть спосіб оплати.';
    }

    return nextErrors;
  };

  const handleOrderHint = () => {
    setMessageTone('neutral');
    setMessage(
      'Дані Нової пошти вже додаються до замовлення: місто, тип точки видачі й конкретне відділення або поштомат.'
    );
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setMessageTone('error');
      setMessage('Не вдалося оформити замовлення. Перевірте форму та вміст кошика.');
      return;
    }

    if (!cart) {
      setMessageTone('error');
      setMessage('Кошик ще завантажується. Спробуйте ще раз за мить.');
      return;
    }

    setIsSubmitting(true);

    try {
      const activePickupPoint = selectedPickupPoint;

      if (!activePickupPoint) {
        setMessageTone('error');
        setMessage('Не вдалося визначити точку видачі Нової пошти. Оберіть її ще раз.');
        return;
      }

      const deliveryDetails = {
        provider: 'nova_poshta' as const,
        city: values.city.trim(),
        pickupKind: values.pickupKind,
        pickupPointId: activePickupPoint.id,
        pickupPointLabel: activePickupPoint.label,
        pickupPointAddress: activePickupPoint.address,
      };

      const nextProfile: UserProfile = {
        email: email.trim().toLowerCase(),
        fullName: values.fullName.trim(),
        phone: normalizePhone(values.phone),
        city: values.city.trim(),
        novaPoshta: deliveryDetails,
        updatedAt: new Date().toISOString(),
      };

      await saveUserProfile(nextProfile);

      const order = await createUserOrder(email, {
        items: cart.items,
        recipientFullName: values.fullName,
        recipientPhone: normalizePhone(values.phone),
        recipientCity: values.city,
        deliveryDetails,
        paymentMethod: values.paymentMethod || 'card',
        comment: values.comment,
      });

      await clearUserCart(email);
      onPlaced(
        `Замовлення ${order.orderNumber} оформлено. ${order.totals.itemsCount} од. на суму ${order.totals.subtotal.toLocaleString('uk-UA')} грн. Доставка: ${formatNovaPoshtaPickupKind(order.deliveryDetails.pickupKind)} ${order.deliveryDetails.pickupPointLabel}.`
      );
    } catch {
      setMessageTone('error');
      setMessage('Сталася помилка під час оформлення. Спробуйте ще раз.');
    } finally {
      setIsSubmitting(false);
    }
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
              <BrandMark subtitle="оформлення замовлення" />

              <Text style={styles.headerTitle}>Підтвердіть деталі покупки</Text>
              <Text style={styles.headerSubtitle}>
                Ми вже підготували товари й суму. Залишилося вказати контактні дані та спосіб оплати.
              </Text>

              <View style={styles.pointsRow}>
                {checkoutPoints.map((item) => (
                  <View key={item} style={styles.pointChip}>
                    <Text style={styles.pointText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.summaryCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <Text style={styles.cardTitle}>Склад замовлення</Text>
              <Text style={styles.cardSubtitle}>
                Остання перевірка перед підтвердженням покупки.
              </Text>

              {isHydrating ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : (
                <>
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Позиції</Text>
                      <Text style={styles.metricValue}>{totals.positionsCount}</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Одиниці</Text>
                      <Text style={styles.metricValue}>{totals.itemsCount}</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Разом</Text>
                      <Text style={styles.metricValue}>{formattedSubtotal}</Text>
                    </View>
                  </View>

                  {cart?.items.length ? (
                    <View style={styles.itemsList}>
                      {cart.items.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            <Text style={styles.itemMeta}>
                              {item.quantity} шт. x {item.price.toLocaleString('uk-UA')} грн
                            </Text>
                          </View>
                          <Text style={styles.itemTotal}>
                            {(item.price * item.quantity).toLocaleString('uk-UA')} грн
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>Кошик порожній</Text>
                      <Text style={styles.emptyText}>
                        Поверніться до кошика, додайте товари й після цього завершіть оформлення.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Animated.View>

            <Animated.View
              style={[
                styles.formCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <Text style={styles.cardTitle}>Дані покупця</Text>
              <Text style={styles.cardSubtitle}>
                Профіль уже допоміг заповнити частину полів, але все можна змінити перед підтвердженням.
              </Text>

              <TextField label="Email" value={email} editable={false} hint="Email акаунта змінюється в профілі або реєстрації." />
              <TextField
                label="Отримувач"
                placeholder="Ім'я та прізвище"
                value={values.fullName}
                onChangeText={handleChange('fullName')}
                autoCapitalize="words"
                error={errors.fullName}
              />
              <TextField
                label="Телефон"
                placeholder="+380..."
                value={values.phone}
                onChangeText={handleChange('phone')}
                keyboardType="phone-pad"
                error={errors.phone}
              />
              <View style={styles.deliverySection}>
                <Text style={styles.deliveryLabel}>Доставка Новою поштою</Text>
                <Text style={styles.deliveryHint}>
                  Оберіть місто й точку отримання. Збережемо їх для наступного замовлення.
                </Text>

                <View style={styles.deliveryChips}>
                  {novaPoshtaDirectory.map((item) => {
                    const isActive = values.city === item.city;

                    return (
                      <Pressable
                        key={item.city}
                        onPress={() => handleSelectCity(item.city)}
                        style={({ pressed }) => [
                          styles.deliveryChip,
                          isActive && styles.deliveryChipActive,
                          pressed && styles.deliveryChipPressed,
                        ]}>
                        <Text style={[styles.deliveryChipText, isActive && styles.deliveryChipTextActive]}>
                          {item.city}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.city ? <Text style={styles.sectionError}>{errors.city}</Text> : null}

                <View style={styles.deliveryModes}>
                  {novaPoshtaPickupOptions.map((option) => {
                    const isActive = values.pickupKind === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => handleSelectPickupKind(option.value)}
                        style={({ pressed }) => [
                          styles.deliveryModeCard,
                          isActive && styles.deliveryModeCardActive,
                          pressed && styles.paymentCardPressed,
                        ]}>
                        <Text style={[styles.deliveryModeTitle, isActive && styles.deliveryModeTitleActive]}>
                          {option.title}
                        </Text>
                        <Text
                          style={[
                            styles.deliveryModeDescription,
                            isActive && styles.deliveryModeDescriptionActive,
                          ]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.pickupPointsList}>
                  {availablePickupPoints.map((pickupPoint) => {
                    const isActive = values.pickupPointId === pickupPoint.id;

                    return (
                      <Pressable
                        key={pickupPoint.id}
                        onPress={() => handleSelectPickupPoint(pickupPoint.id)}
                        style={({ pressed }) => [
                          styles.pickupPointCard,
                          isActive && styles.pickupPointCardActive,
                          pressed && styles.paymentCardPressed,
                        ]}>
                        <Text style={[styles.pickupPointTitle, isActive && styles.pickupPointTitleActive]}>
                          {pickupPoint.label}
                        </Text>
                        <Text
                          style={[
                            styles.pickupPointAddress,
                            isActive && styles.pickupPointAddressActive,
                          ]}>
                          {pickupPoint.address}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.pickupPointId ? (
                  <Text style={styles.sectionError}>{errors.pickupPointId}</Text>
                ) : selectedPickupPoint ? (
                  <Text style={styles.deliverySummary}>
                    Обрана точка: {formatNovaPoshtaPickupKind(values.pickupKind)} {selectedPickupPoint.label},{' '}
                    {selectedPickupPoint.address}
                  </Text>
                ) : null}
              </View>
              <TextField
                label="Коментар до замовлення"
                placeholder="Побажання до дзвінка або доставки"
                value={values.comment}
                onChangeText={handleChange('comment')}
                multiline
                numberOfLines={4}
                style={styles.commentInput}
                hint="Наприклад: телефонувати перед відправкою або не дзвонити після 20:00."
              />

              <View style={styles.paymentSection}>
                <Text style={styles.paymentLabel}>Спосіб оплати</Text>
                <View style={styles.paymentList}>
                  {paymentOptions.map((option) => {
                    const isActive = values.paymentMethod === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => handleSelectPayment(option.value)}
                        style={({ pressed }) => [
                          styles.paymentCard,
                          isActive && styles.paymentCardActive,
                          pressed && styles.paymentCardPressed,
                        ]}>
                        <Text style={[styles.paymentTitle, isActive && styles.paymentTitleActive]}>
                          {option.title}
                        </Text>
                        <Text
                          style={[
                            styles.paymentDescription,
                            isActive && styles.paymentDescriptionActive,
                          ]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.paymentMethod ? (
                  <Text style={styles.sectionError}>{errors.paymentMethod}</Text>
                ) : null}
                {errors.cart ? <Text style={styles.sectionError}>{errors.cart}</Text> : null}
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.noteCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <Text style={styles.noteLabel}>Що входить у цей етап</Text>
              <Text style={styles.noteText}>
                Після підтвердження ми створимо локальне замовлення, збережемо деталі Нової пошти, суму покупки й очистимо кошик. Наступні модулі зможуть використати ці дані без переробки checkout.
              </Text>
            </Animated.View>

            <PrimaryButton
              title={
                isSubmitting
                  ? 'Оформлюємо...'
                  : totals.itemsCount
                    ? `Підтвердити замовлення на ${formattedSubtotal}`
                    : 'Кошик порожній'
              }
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
            />

            <View style={styles.actionsRow}>
              <Pressable onPress={onBack}>
                <Text style={styles.linkText}>Назад до кошика</Text>
              </Pressable>
              <Pressable onPress={handleOrderHint}>
                <Text style={styles.linkText}>Що ще залишилось?</Text>
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
                    messageTone === 'error' ? styles.messageTextError : styles.messageTextNeutral,
                  ]}>
                  {message}
                </Text>
              </View>
            ) : null}
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
    height: 248,
    backgroundColor: colors.panelStrong,
  },
  topHalo: {
    position: 'absolute',
    top: 66,
    right: -44,
    width: 168,
    height: 168,
    borderRadius: 84,
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
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
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
    marginTop: 10,
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
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  pointText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentSoft,
  },
  summaryCard: {
    marginTop: 18,
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  formCard: {
    marginTop: 18,
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  cardTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.textDark,
  },
  cardSubtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
  },
  loaderWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    minHeight: 92,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  metricValue: {
    marginTop: 10,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    color: colors.textDark,
  },
  itemsList: {
    marginTop: 18,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemInfo: {
    flex: 1,
    gap: 6,
  },
  itemTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textDark,
  },
  itemMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textDark,
  },
  emptyCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.textDark,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMutedDark,
  },
  commentInput: {
    minHeight: 112,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  deliverySection: {
    marginBottom: 18,
  },
  deliveryLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: colors.textMutedDark,
  },
  deliveryHint: {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  deliveryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deliveryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  deliveryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  deliveryChipPressed: {
    transform: [{ translateY: 1 }],
  },
  deliveryChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  deliveryChipTextActive: {
    color: colors.accentDark,
  },
  deliveryModes: {
    marginTop: 14,
    gap: 12,
  },
  deliveryModeCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardMuted,
  },
  deliveryModeCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  deliveryModeTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  deliveryModeTitleActive: {
    color: colors.accentDark,
  },
  deliveryModeDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  deliveryModeDescriptionActive: {
    color: colors.accentDark,
  },
  pickupPointsList: {
    marginTop: 14,
    gap: 12,
  },
  pickupPointCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardMuted,
  },
  pickupPointCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  pickupPointTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  pickupPointTitleActive: {
    color: colors.accentDark,
  },
  pickupPointAddress: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  pickupPointAddressActive: {
    color: colors.accentDark,
  },
  deliverySummary: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.success,
    fontWeight: '700',
  },
  paymentSection: {
    marginTop: 4,
  },
  paymentLabel: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: colors.textMutedDark,
  },
  paymentList: {
    gap: 12,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardMuted,
  },
  paymentCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  paymentCardPressed: {
    transform: [{ translateY: 1 }],
  },
  paymentTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  paymentTitleActive: {
    color: colors.accentDark,
  },
  paymentDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  paymentDescriptionActive: {
    color: colors.accentDark,
  },
  sectionError: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    fontWeight: '600',
  },
  noteCard: {
    marginTop: 18,
    marginBottom: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  noteText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.success,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  linkText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.accentDark,
  },
  messageCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  messageCardNeutral: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.successBorder,
  },
  messageCardError: {
    backgroundColor: '#fff5f5',
    borderColor: '#f0c7c7',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  messageTextNeutral: {
    color: colors.accentDark,
  },
  messageTextError: {
    color: colors.error,
  },
});
