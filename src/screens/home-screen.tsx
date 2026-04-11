import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  catalogCategories,
  getCatalogCategoryTitle,
  productCatalog,
} from '../data/catalog';
import {
  addItemToUserCart,
  calculateCartTotals,
  ensureUserCart,
} from '../storage/cart-storage';
import { loadUserOrders } from '../storage/orders-storage';
import { colors } from '../theme/colors';
import type { AuthSession } from '../types/auth';
import type { UserCart } from '../types/cart';
import type { UserOrder } from '../types/order';
import type { ProductCategory, ProductItem } from '../types/product';

type HomeScreenProps = {
  session: AuthSession;
  notice?: string;
  onOpenOrders: () => void;
  onOpenCart: () => void;
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
};

type CatalogTab = 'all' | ProductCategory;

function formatPrice(value: number) {
  return `${value.toLocaleString('uk-UA')} грн`;
}

export function HomeScreen({
  session,
  notice = '',
  onOpenOrders,
  onOpenCart,
  onOpenProfile,
  onOpenChangePassword,
  onLogout,
}: HomeScreenProps) {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [cart, setCart] = useState<UserCart | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CatalogTab>('all');
  const [activeProductId, setActiveProductId] = useState('');
  const [catalogMessage, setCatalogMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const hydrateHome = async () => {
      setIsOrdersLoading(true);
      setIsCartLoading(true);

      const [storedOrders, storedCart] = await Promise.all([
        loadUserOrders(session.email),
        ensureUserCart(session.email),
      ]);

      if (!isMounted) {
        return;
      }

      setOrders(storedOrders);
      setCart(storedCart);
      setIsOrdersLoading(false);
      setIsCartLoading(false);
    };

    void hydrateHome();

    return () => {
      isMounted = false;
    };
  }, [session.email]);

  const latestOrder = orders[0] ?? null;
  const cartTotals = useMemo(() => calculateCartTotals(cart?.items ?? []), [cart?.items]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'all') {
      return productCatalog;
    }

    return productCatalog.filter((product) => product.category === activeCategory);
  }, [activeCategory]);

  const heroTitle =
    activeCategory === 'all'
      ? 'Збирайте замовлення з каталогу Rozetka'
      : `Добірка: ${getCatalogCategoryTitle(activeCategory)}`;

  const handleAddProduct = async (product: ProductItem) => {
    setActiveProductId(product.id);

    try {
      const updatedCart = await addItemToUserCart(session.email, {
        id: product.id,
        title: product.title,
        price: product.price,
      });

      setCart(updatedCart);
      setCatalogMessage(`Товар "${product.title}" додано в кошик.`);
    } finally {
      setActiveProductId('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBand} />
      <View style={styles.topGlow} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <BrandMark subtitle="головна сторінка" />

          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>
            Каталог уже готовий для перегляду: обирайте категорію, додавайте товари в кошик і
            переходьте до оформлення без зайвих кроків.
          </Text>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>Товарів</Text>
              <Text style={styles.heroMetricValue}>{productCatalog.length}</Text>
            </View>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>У кошику</Text>
              <Text style={styles.heroMetricValue}>
                {isCartLoading ? '...' : cartTotals.itemsCount}
              </Text>
            </View>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>Замовлень</Text>
              <Text style={styles.heroMetricValue}>
                {isOrdersLoading ? '...' : orders.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.catalogCard}>
          <Text style={styles.sectionLabel}>Категорії</Text>
          <Text style={styles.sectionTitle}>Вітрина товарів</Text>
          <Text style={styles.sectionSubtitle}>
            Це базовий каталог для мобільного застосунку: далі на нього легко накладуться пошук,
            фільтри й картка товару.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsRow}>
            <Pressable
              onPress={() => setActiveCategory('all')}
              style={({ pressed }) => [
                styles.categoryChip,
                activeCategory === 'all' && styles.categoryChipActive,
                pressed && styles.categoryChipPressed,
              ]}>
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === 'all' && styles.categoryChipTextActive,
                ]}>
                Усе
              </Text>
            </Pressable>

            {catalogCategories.map((category) => {
              const isActive = activeCategory === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setActiveCategory(category.id)}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                    pressed && styles.categoryChipPressed,
                  ]}>
                  <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                    {category.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.productsList}>
            {visibleProducts.map((product) => {
              const isBusy = activeProductId === product.id;

              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productTopRow}>
                    <View style={styles.productBrandWrap}>
                      <Text style={styles.productBrand}>{product.brand}</Text>
                      {product.badge ? <Text style={styles.productBadge}>{product.badge}</Text> : null}
                    </View>
                    <Text style={styles.productCategoryLabel}>
                      {getCatalogCategoryTitle(product.category)}
                    </Text>
                  </View>

                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productSubtitle}>{product.subtitle}</Text>

                  <View style={styles.productMetaRow}>
                    <Text style={styles.productRating}>★ {product.rating.toFixed(1)}</Text>
                    <Text style={styles.productReviews}>{product.reviewsCount} відгуків</Text>
                  </View>

                  <View style={styles.productBottomRow}>
                    <View style={styles.priceBlock}>
                      <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                      {product.previousPrice ? (
                        <Text style={styles.productPreviousPrice}>
                          {formatPrice(product.previousPrice)}
                        </Text>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={() => void handleAddProduct(product)}
                      disabled={isBusy}
                      style={({ pressed }) => [
                        styles.addToCartButton,
                        isBusy && styles.addToCartButtonDisabled,
                        pressed && !isBusy && styles.addToCartButtonPressed,
                      ]}>
                      <Text style={styles.addToCartButtonText}>
                        {isBusy ? 'Додаємо...' : 'В кошик'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {catalogMessage ? (
          <View style={styles.catalogMessageCard}>
            <Text style={styles.catalogMessageText}>{catalogMessage}</Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.sessionCard}>
            <Text style={styles.sectionLabel}>Активний користувач</Text>
            <Text style={styles.userEmail}>{session.email}</Text>
            <Text style={styles.sessionMeta}>
              Вхід виконано: {new Date(session.loggedInAt).toLocaleString('uk-UA')}
            </Text>
          </View>

          <View style={styles.cartCard}>
            <Text style={styles.sectionLabel}>Мій кошик</Text>
            {isCartLoading ? (
              <View style={styles.inlineLoader}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
              <>
                <Text style={styles.cartTitle}>{cartTotals.itemsCount} од. у кошику</Text>
                <Text style={styles.cartMeta}>
                  {cartTotals.positionsCount} позицій на суму {formatPrice(cartTotals.subtotal)}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.ordersCard}>
          <Text style={styles.sectionLabel}>Замовлення користувача</Text>
          {isOrdersLoading ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : latestOrder ? (
            <View style={styles.latestOrderCard}>
              <Text style={styles.latestOrderTitle}>Останнє оформлене замовлення</Text>
              <Text style={styles.latestOrderMeta}>
                {latestOrder.orderNumber} • {latestOrder.totals.itemsCount} од. •{' '}
                {formatPrice(latestOrder.totals.subtotal)}
              </Text>
              <Text style={styles.latestOrderMeta}>
                {latestOrder.recipientCity} • Нова пошта: {latestOrder.deliveryDetails.pickupPointLabel}
              </Text>
            </View>
          ) : (
            <Text style={styles.ordersEmptyText}>
              Замовлень ще немає. Додайте товари з каталогу в кошик і завершіть першу покупку.
            </Text>
          )}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.sectionLabel}>{notice ? 'Остання дія' : 'Поточний статус'}</Text>
          <Text style={styles.noteText}>
            {notice ||
              'Каталог уже працює локально: товари можна переглядати на головній сторінці та додавати в кошик.'}
          </Text>
        </View>

        <PrimaryButton
          title={
            isCartLoading
              ? 'Завантажуємо кошик...'
              : cartTotals.itemsCount
                ? `Перейти в кошик (${cartTotals.itemsCount})`
                : 'Відкрити кошик'
          }
          onPress={onOpenCart}
          disabled={isCartLoading}
        />
        <View style={styles.actionsGap} />
        <PrimaryButton title="Мої замовлення" onPress={onOpenOrders} variant="secondary" />
        <View style={styles.actionsGap} />
        <PrimaryButton title="Мій профіль" onPress={onOpenProfile} variant="secondary" />
        <View style={styles.actionsGap} />
        <PrimaryButton title="Змінити пароль" onPress={onOpenChangePassword} variant="secondary" />
        <View style={styles.actionsGap} />
        <PrimaryButton title="Вийти з акаунта" onPress={onLogout} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: colors.panelStrong,
  },
  topGlow: {
    position: 'absolute',
    top: 72,
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
  heroCard: {
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
  heroTitle: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.textLight,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMutedLight,
  },
  heroMetricsRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  heroMetricBox: {
    flex: 1,
    minHeight: 92,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.borderDark,
    justifyContent: 'space-between',
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentSoft,
  },
  heroMetricValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.textLight,
  },
  catalogCard: {
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentDark,
  },
  sectionTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.textDark,
  },
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
  },
  categoryChipsRow: {
    marginTop: 18,
    paddingRight: 8,
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryChipPressed: {
    transform: [{ translateY: 1 }],
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  categoryChipTextActive: {
    color: colors.accentDark,
  },
  productsList: {
    marginTop: 18,
    gap: 14,
  },
  productCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  productBrandWrap: {
    flex: 1,
    gap: 6,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.warning,
    color: colors.textDark,
    fontSize: 11,
    fontWeight: '900',
  },
  productCategoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMutedDark,
  },
  productTitle: {
    marginTop: 14,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    color: colors.textDark,
  },
  productSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMutedDark,
  },
  productMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  productRating: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  productReviews: {
    fontSize: 13,
    color: colors.textMutedDark,
  },
  productBottomRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  priceBlock: {
    flex: 1,
  },
  productPrice: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.textDark,
  },
  productPreviousPrice: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMutedDark,
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    minWidth: 116,
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.accentMuted,
  },
  addToCartButtonPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: colors.accentDark,
  },
  addToCartButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textLight,
  },
  catalogMessageCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  catalogMessageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.success,
  },
  summaryRow: {
    marginTop: 18,
    gap: 18,
  },
  sessionCard: {
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
  cartCard: {
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
  userEmail: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: colors.textDark,
  },
  sessionMeta: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMutedDark,
  },
  inlineLoader: {
    marginTop: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartTitle: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: colors.textDark,
  },
  cartMeta: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMutedDark,
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
  latestOrderCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  latestOrderTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.textDark,
  },
  latestOrderMeta: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMutedDark,
  },
  ordersEmptyText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
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
  noteText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.success,
    fontWeight: '700',
  },
  actionsGap: {
    height: 12,
  },
});
