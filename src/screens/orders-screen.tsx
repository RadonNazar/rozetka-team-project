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
import { mergeItemsIntoUserCart } from '../storage/cart-storage';
import { loadUserOrders } from '../storage/orders-storage';
import { colors } from '../theme/colors';
import type { NovaPoshtaPickupKind } from '../types/delivery';
import type { PaymentMethod, UserOrder } from '../types/order';

type OrdersScreenProps = {
  email: string;
  onBack: () => void;
  onOpenCart: () => void;
};

const ordersPoints = ['Історія', 'Деталі', 'Повторне замовлення'];

function formatPaymentMethod(value: PaymentMethod) {
  if (value === 'cash') {
    return 'При отриманні';
  }

  if (value === 'installments') {
    return 'Частинами';
  }

  return 'Карткою онлайн';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('uk-UA');
}

function formatNovaPoshtaPickupKind(value: NovaPoshtaPickupKind) {
  return value === 'postomat' ? 'Поштомат' : 'Відділення';
}

export function OrdersScreen({ email, onBack, onOpenCart }: OrdersScreenProps) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [message, setMessage] = useState('');
  const [activeRepeatOrderId, setActiveRepeatOrderId] = useState('');

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

    const hydrateOrders = async () => {
      const storedOrders = await loadUserOrders(email);

      if (!isMounted) {
        return;
      }

      setOrders(storedOrders);
      setIsHydrating(false);
    };

    void hydrateOrders();

    return () => {
      isMounted = false;
    };
  }, [email]);

  const metrics = useMemo(() => {
    return orders.reduce(
      (result, order) => ({
        ordersCount: result.ordersCount + 1,
        itemsCount: result.itemsCount + order.totals.itemsCount,
        subtotal: result.subtotal + order.totals.subtotal,
      }),
      {
        ordersCount: 0,
        itemsCount: 0,
        subtotal: 0,
      }
    );
  }, [orders]);

  const handleRepeatOrder = async (order: UserOrder) => {
    setActiveRepeatOrderId(order.id);

    try {
      await mergeItemsIntoUserCart(email, order.items);
      setMessage(
        `Замовлення ${order.orderNumber} додано назад у кошик. Можна скоригувати позиції й оформити повторно.`
      );
    } finally {
      setActiveRepeatOrderId('');
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
              <BrandMark subtitle="мої замовлення" />

              <Text style={styles.headerTitle}>Історія оформлених покупок</Text>
              <Text style={styles.headerSubtitle}>
                Тут зібрані всі локально збережені замовлення користувача. Можна перевірити деталі
                покупки та швидко повернути товари назад у кошик.
              </Text>

              <View style={styles.pointsRow}>
                {ordersPoints.map((item) => (
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
              <Text style={styles.cardTitle}>Підсумок по замовленнях</Text>
              <Text style={styles.cardSubtitle}>
                Коротка статистика для поточного користувача {email}.
              </Text>

              {isHydrating ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : (
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Замовлення</Text>
                    <Text style={styles.metricValue}>{metrics.ordersCount}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Одиниці</Text>
                    <Text style={styles.metricValue}>{metrics.itemsCount}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>На суму</Text>
                    <Text style={styles.metricValue}>
                      {metrics.subtotal.toLocaleString('uk-UA')} грн
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>

            <Animated.View
              style={[
                styles.ordersCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <Text style={styles.cardTitle}>Список замовлень</Text>
              <Text style={styles.cardSubtitle}>
                Для кожного замовлення зберігаються склад, оплата, контактні дані та дата
                оформлення.
              </Text>

              {isHydrating ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : orders.length ? (
                <View style={styles.ordersList}>
                  {orders.map((order) => {
                    const isRepeating = activeRepeatOrderId === order.id;

                    return (
                      <View key={order.id} style={styles.orderCard}>
                        <View style={styles.orderHeader}>
                          <View style={styles.orderHeaderInfo}>
                            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                            <Text style={styles.orderMeta}>
                              {formatDate(order.createdAt)} • {formatPaymentMethod(order.paymentMethod)}
                            </Text>
                          </View>

                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>Оформлено</Text>
                          </View>
                        </View>

                        <View style={styles.orderStatsRow}>
                          <View style={styles.orderStatBox}>
                            <Text style={styles.orderStatLabel}>Товарів</Text>
                            <Text style={styles.orderStatValue}>{order.totals.itemsCount}</Text>
                          </View>
                          <View style={styles.orderStatBox}>
                            <Text style={styles.orderStatLabel}>Позицій</Text>
                            <Text style={styles.orderStatValue}>{order.totals.positionsCount}</Text>
                          </View>
                          <View style={styles.orderStatBox}>
                            <Text style={styles.orderStatLabel}>Сума</Text>
                            <Text style={styles.orderStatValue}>
                              {order.totals.subtotal.toLocaleString('uk-UA')} грн
                            </Text>
                          </View>
                        </View>

                        <View style={styles.recipientCard}>
                          <Text style={styles.recipientTitle}>Отримувач</Text>
                          <Text style={styles.recipientText}>{order.recipientFullName}</Text>
                          <Text style={styles.recipientText}>{order.recipientPhone}</Text>
                          <Text style={styles.recipientText}>{order.recipientCity}</Text>
                          {order.comment ? (
                            <Text style={styles.recipientComment}>Коментар: {order.comment}</Text>
                          ) : null}
                        </View>

                        <View style={styles.deliveryCard}>
                          <Text style={styles.deliveryTitle}>Доставка Новою поштою</Text>
                          <Text style={styles.deliveryText}>
                            {formatNovaPoshtaPickupKind(order.deliveryDetails.pickupKind)} •{' '}
                            {order.deliveryDetails.pickupPointLabel}
                          </Text>
                          <Text style={styles.deliveryText}>{order.deliveryDetails.city}</Text>
                          <Text style={styles.deliveryAddress}>
                            {order.deliveryDetails.pickupPointAddress}
                          </Text>
                        </View>

                        <View style={styles.itemsList}>
                          {order.items.map((item) => (
                            <View key={`${order.id}-${item.id}`} style={styles.itemRow}>
                              <View style={styles.itemInfo}>
                                <Text style={styles.itemTitle}>{item.title}</Text>
                                <Text style={styles.itemMeta}>
                                  {item.quantity} шт. × {item.price.toLocaleString('uk-UA')} грн
                                </Text>
                              </View>
                              <Text style={styles.itemTotal}>
                                {(item.price * item.quantity).toLocaleString('uk-UA')} грн
                              </Text>
                            </View>
                          ))}
                        </View>

                        <PrimaryButton
                          title={isRepeating ? 'Додаємо в кошик...' : 'Замовити ще раз'}
                          onPress={() => void handleRepeatOrder(order)}
                          disabled={Boolean(activeRepeatOrderId)}
                          variant="secondary"
                        />
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Замовлень ще немає</Text>
                  <Text style={styles.emptyText}>
                    Перейдіть у кошик, додайте товари і підтвердьте покупку. Після цього перше
                    замовлення з’явиться тут автоматично.
                  </Text>
                </View>
              )}
            </Animated.View>

            <PrimaryButton title="Перейти в кошик" onPress={onOpenCart} />

            <View style={styles.actionsRow}>
              <Pressable onPress={onBack}>
                <Text style={styles.linkText}>Назад до кабінету</Text>
              </Pressable>
              <Pressable onPress={onOpenCart}>
                <Text style={styles.linkText}>До кошика</Text>
              </Pressable>
            </View>

            {message ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageText}>{message}</Text>
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
    top: 68,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
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
  ordersCard: {
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
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.textDark,
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderHeaderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: colors.textDark,
  },
  orderMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  orderStatsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  orderStatBox: {
    flex: 1,
    minHeight: 84,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'space-between',
  },
  orderStatLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  orderStatValue: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.textDark,
  },
  recipientCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  recipientTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accentDark,
  },
  recipientText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textDark,
  },
  recipientComment: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  deliveryCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  deliveryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.success,
  },
  deliveryText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textDark,
    fontWeight: '700',
  },
  deliveryAddress: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
  },
  itemsList: {
    marginTop: 16,
    marginBottom: 16,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  itemMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMutedDark,
  },
  itemTotal: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.textDark,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    color: colors.textDark,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.accentDark,
  },
  messageCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.success,
  },
});
