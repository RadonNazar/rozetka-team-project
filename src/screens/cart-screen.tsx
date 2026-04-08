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
import {
  addItemToUserCart,
  calculateCartTotals,
  ensureUserCart,
  removeItemFromUserCart,
  updateUserCartItemQuantity,
} from '../storage/cart-storage';
import { colors } from '../theme/colors';
import type { UserCart } from '../types/cart';

type CartScreenProps = {
  email: string;
  onBack: () => void;
  onOpenCheckout: () => void;
};

const cartPoints = ['Товари', 'Кількість', 'Підсумок'];
const mockProducts = [
  {
    id: 'iphone-15-128',
    title: 'Apple iPhone 15 128GB Black',
    subtitle: 'Смартфон',
    price: 38999,
  },
  {
    id: 'airpods-pro-2',
    title: 'Apple AirPods Pro 2',
    subtitle: 'Навушники',
    price: 11999,
  },
  {
    id: 'anker-20000',
    title: 'Anker Power Bank 20000 mAh',
    subtitle: 'Портативна батарея',
    price: 2199,
  },
];

export function CartScreen({ email, onBack, onOpenCheckout }: CartScreenProps) {
  const [cart, setCart] = useState<UserCart | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [message, setMessage] = useState('');
  const [activeProductId, setActiveProductId] = useState('');
  const [activeQuantityItemId, setActiveQuantityItemId] = useState('');
  const [activeRemoveItemId, setActiveRemoveItemId] = useState('');

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

    const hydrateCart = async () => {
      const storedCart = await ensureUserCart(email);

      if (!isMounted) {
        return;
      }

      setCart(storedCart);
      setIsHydrating(false);
    };

    void hydrateCart();

    return () => {
      isMounted = false;
    };
  }, [email]);

  const totals = useMemo(() => calculateCartTotals(cart?.items ?? []), [cart?.items]);

  const handleCheckout = () => {
    if (!cart?.items.length) {
      setMessage('Спочатку додайте хоча б один товар у кошик.');
      return;
    }

    setMessage('');
    onOpenCheckout();
  };

  const handleAddProduct = async (product: (typeof mockProducts)[number]) => {
    setActiveProductId(product.id);

    try {
      const updatedCart = await addItemToUserCart(email, {
        id: product.id,
        title: product.title,
        price: product.price,
      });

      setCart(updatedCart);
      setMessage(`Товар "${product.title}" додано в кошик.`);
    } finally {
      setActiveProductId('');
    }
  };

  const handleChangeQuantity = async (itemId: string, nextQuantity: number) => {
    setActiveQuantityItemId(itemId);

    try {
      const updatedCart = await updateUserCartItemQuantity(email, itemId, nextQuantity);
      const changedItem = updatedCart.items.find((item) => item.id === itemId);

      setCart(updatedCart);

      if (changedItem) {
        setMessage(`Кількість товару "${changedItem.title}" змінено на ${changedItem.quantity}.`);
      }
    } finally {
      setActiveQuantityItemId('');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!cart) {
      return;
    }

    const removedItem = cart.items.find((item) => item.id === itemId);

    if (!removedItem) {
      return;
    }

    setActiveRemoveItemId(itemId);

    try {
      const updatedCart = await removeItemFromUserCart(email, itemId);
      setCart(updatedCart);
      setMessage(`Товар "${removedItem.title}" видалено з кошика.`);
    } finally {
      setActiveRemoveItemId('');
    }
  };

  const formattedSubtotal = `${totals.subtotal.toLocaleString('uk-UA')} грн`;

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
              <BrandMark subtitle="кошик користувача" />

              <Text style={styles.headerTitle}>Ваш кошик готовий до наповнення</Text>
              <Text style={styles.headerSubtitle}>
                Ми вже створили основу кошика для {email}, щоб далі безболісно додати товари, керувати кількістю та переходити до оформлення.
              </Text>

              <View style={styles.pointsRow}>
                {cartPoints.map((item) => (
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
              <Text style={styles.cardTitle}>Стан кошика</Text>
              <Text style={styles.cardSubtitle}>
                Зараз це базова версія кошика з локальним збереженням для кожного користувача.
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
                      <Text style={styles.metricLabel}>Сума</Text>
                      <Text style={styles.metricValue}>{formattedSubtotal}</Text>
                    </View>
                  </View>

                  {cart?.items.length ? (
                    <View style={styles.itemsList}>
                      {cart.items.map((item) => {
                        const isQuantityBusy = activeQuantityItemId === item.id;
                        const isRemoveBusy = activeRemoveItemId === item.id;
                        const isItemBusy = isQuantityBusy || isRemoveBusy;

                        return (
                          <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                              <Text style={styles.itemTitle}>{item.title}</Text>
                              <Text style={styles.itemPrice}>
                                {(item.price * item.quantity).toLocaleString('uk-UA')} грн
                              </Text>
                            </View>
                            <View style={styles.itemActionsRow}>
                              <View style={styles.quantityRow}>
                                <Text style={styles.itemMeta}>Кількість:</Text>

                                <View style={styles.quantityControls}>
                                  <Pressable
                                    onPress={() =>
                                      void handleChangeQuantity(item.id, item.quantity - 1)
                                    }
                                    disabled={item.quantity === 1 || isItemBusy}
                                    style={({ pressed }) => [
                                      styles.quantityButton,
                                      styles.quantityButtonSecondary,
                                      (item.quantity === 1 || isItemBusy) &&
                                        styles.quantityButtonDisabled,
                                      pressed &&
                                        item.quantity !== 1 &&
                                        !isItemBusy &&
                                        styles.quantityButtonPressed,
                                    ]}>
                                    <Text style={styles.quantityButtonLabel}>-</Text>
                                  </Pressable>

                                  <View style={styles.quantityValueBox}>
                                    <Text style={styles.quantityValue}>
                                      {isQuantityBusy ? '...' : item.quantity}
                                    </Text>
                                  </View>

                                  <Pressable
                                    onPress={() =>
                                      void handleChangeQuantity(item.id, item.quantity + 1)
                                    }
                                    disabled={isItemBusy}
                                    style={({ pressed }) => [
                                      styles.quantityButton,
                                      isItemBusy && styles.quantityButtonDisabled,
                                      pressed && !isItemBusy && styles.quantityButtonPressed,
                                    ]}>
                                    <Text style={styles.quantityButtonLabelPrimary}>+</Text>
                                  </Pressable>
                                </View>
                              </View>

                              <Pressable
                                onPress={() => void handleRemoveItem(item.id)}
                                disabled={isItemBusy}
                                style={({ pressed }) => [
                                  styles.removeButton,
                                  isItemBusy && styles.removeButtonDisabled,
                                  pressed && !isItemBusy && styles.removeButtonPressed,
                                ]}>
                                <Text style={styles.removeButtonLabel}>
                                  {isRemoveBusy ? '...' : 'Видалити'}
                                </Text>
                              </Pressable>
                            </View>
                            <Text style={styles.itemMeta}>
                              Ціна за одиницю: {item.price.toLocaleString('uk-UA')} грн
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyCard}>
                      <View style={styles.emptyIcon}>
                        <View style={styles.emptyIconHandle} />
                      </View>
                      <Text style={styles.emptyTitle}>Кошик поки порожній</Text>
                      <Text style={styles.emptyText}>
                        Це очікувано: модуль уже створений, а нижче є перші товари, які можна додати просто зараз.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Animated.View>

            <Animated.View
              style={[
                styles.catalogCard,
                {
                  opacity: heroOpacity,
                  transform: [{ translateY: heroShift }],
                },
              ]}>
              <Text style={styles.cardTitle}>Популярні товари</Text>
              <Text style={styles.cardSubtitle}>
                Це стартовий mock-каталог для перевірки додавання товарів у кошик.
              </Text>

              <View style={styles.catalogList}>
                {mockProducts.map((product) => (
                  <View key={product.id} style={styles.catalogItem}>
                    <View style={styles.catalogInfo}>
                      <Text style={styles.catalogBadge}>{product.subtitle}</Text>
                      <Text style={styles.catalogTitle}>{product.title}</Text>
                      <Text style={styles.catalogPrice}>
                        {product.price.toLocaleString('uk-UA')} грн
                      </Text>
                    </View>

                    <View style={styles.catalogAction}>
                      <PrimaryButton
                        title={activeProductId === product.id ? 'Додаємо...' : 'Додати'}
                        onPress={() => void handleAddProduct(product)}
                        disabled={Boolean(activeProductId)}
                      />
                    </View>
                  </View>
                ))}
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
              <Text style={styles.noteLabel}>Що вже підготовлено</Text>
              <Text style={styles.noteText}>
                Для цього користувача зберігається окремий кошик. Далі ми зможемо без зміни архітектури додавати товари, змінювати кількість, видаляти позиції та рахувати підсумок.
              </Text>
            </Animated.View>

            <PrimaryButton
              title={totals.itemsCount ? 'Оформити замовлення' : 'Кошик порожній'}
              onPress={handleCheckout}
              disabled={!totals.itemsCount}
            />

            <View style={styles.actionsRow}>
              <Pressable onPress={onBack}>
                <Text style={styles.linkText}>Назад до кабінету</Text>
              </Pressable>
              <Pressable onPress={handleCheckout}>
                <Text style={styles.linkText}>До оформлення</Text>
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
  summaryCard: {
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
  cardTitle: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    color: colors.textDark,
  },
  cardSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMutedDark,
  },
  loaderWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  metricValue: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.textDark,
  },
  emptyCard: {
    marginTop: 18,
    alignItems: 'center',
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyIcon: {
    width: 56,
    height: 42,
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: 14,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconHandle: {
    position: 'absolute',
    top: -12,
    width: 28,
    height: 14,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.accent,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: colors.bg,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.textDark,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
    textAlign: 'center',
  },
  itemsList: {
    marginTop: 18,
    gap: 12,
  },
  itemCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    color: colors.textDark,
  },
  itemPrice: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    color: colors.textDark,
  },
  itemMeta: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMutedDark,
  },
  itemActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  quantityButtonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quantityButtonDisabled: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  quantityButtonPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: colors.accentDark,
  },
  quantityButtonLabel: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.textDark,
  },
  quantityButtonLabelPrimary: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.textLight,
  },
  quantityValueBox: {
    minWidth: 52,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
  },
  quantityValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: colors.textDark,
  },
  removeButton: {
    minWidth: 98,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#fff3f3',
    borderWidth: 1,
    borderColor: '#efc5c5',
  },
  removeButtonDisabled: {
    backgroundColor: '#f5dede',
    borderColor: '#f5dede',
  },
  removeButtonPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: '#f0d7d7',
  },
  removeButtonLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.error,
  },
  catalogCard: {
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
  catalogList: {
    marginTop: 18,
    gap: 12,
  },
  catalogItem: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  catalogInfo: {
    gap: 8,
  },
  catalogBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentDark,
  },
  catalogTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.textDark,
  },
  catalogPrice: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: colors.textDark,
  },
  catalogAction: {
    marginTop: 14,
  },
  noteCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentDark,
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
    backgroundColor: colors.cardMuted,
    borderColor: colors.borderLight,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
    fontWeight: '600',
  },
});
