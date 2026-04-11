import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/brand-mark';
import { PrimaryButton } from '../components/primary-button';
import {
  catalogBrands,
  catalogCategories,
  catalogPriceFilters,
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
import type { ProductCategory, ProductItem, ProductPriceFilter } from '../types/product';

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
type BrandFilter = 'all' | string;

function formatPrice(value: number) {
  return `${value.toLocaleString('uk-UA')} грн`;
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function matchesPriceFilter(product: ProductItem, priceFilter: ProductPriceFilter) {
  if (priceFilter === 'all') {
    return true;
  }

  if (priceFilter === 'under-10000') {
    return product.price < 10000;
  }

  if (priceFilter === '10000-30000') {
    return product.price >= 10000 && product.price < 30000;
  }

  if (priceFilter === '30000-plus') {
    return product.price >= 30000;
  }

  return typeof product.previousPrice === 'number' && product.previousPrice > product.price;
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
  const [activeBrand, setActiveBrand] = useState<BrandFilter>('all');
  const [activePriceFilter, setActivePriceFilter] = useState<ProductPriceFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    const normalizedSearchQuery = normalizeValue(searchQuery);

    return productCatalog.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' ? true : product.category === activeCategory;
      const matchesBrand = activeBrand === 'all' ? true : product.brand === activeBrand;
      const matchesSearch = normalizedSearchQuery
        ? [product.title, product.subtitle, product.brand, product.badge ?? '', getCatalogCategoryTitle(product.category)]
            .some((value) => normalizeValue(value).includes(normalizedSearchQuery))
        : true;
      const matchesPrice = matchesPriceFilter(product, activePriceFilter);

      return matchesCategory && matchesBrand && matchesSearch && matchesPrice;
    });
  }, [activeBrand, activeCategory, activePriceFilter, searchQuery]);

  const heroTitle =
    activeCategory === 'all'
      ? 'Знаходьте товари швидше'
      : `Категорія: ${getCatalogCategoryTitle(activeCategory)}`;

  const appliedFiltersCount = useMemo(() => {
    let count = 0;

    if (activeCategory !== 'all') {
      count += 1;
    }

    if (activeBrand !== 'all') {
      count += 1;
    }

    if (activePriceFilter !== 'all') {
      count += 1;
    }

    if (searchQuery.trim()) {
      count += 1;
    }

    return count;
  }, [activeBrand, activeCategory, activePriceFilter, searchQuery]);

  const resultsLabel = `${visibleProducts.length} ${
    visibleProducts.length === 1 ? 'товар' : visibleProducts.length < 5 ? 'товари' : 'товарів'
  }`;

  const resetFilters = () => {
    setActiveCategory('all');
    setActiveBrand('all');
    setActivePriceFilter('all');
    setSearchQuery('');
  };

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
          <BrandMark subtitle="пошук і фільтрація" />

          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>
            Шукайте товари за назвою або брендом, комбінуйте категорію з фільтрами й швидко
            відбирайте релевантні позиції каталогу.
          </Text>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>Результати</Text>
              <Text style={styles.heroMetricValue}>{resultsLabel}</Text>
            </View>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>Фільтри</Text>
              <Text style={styles.heroMetricValue}>{appliedFiltersCount}</Text>
            </View>
            <View style={styles.heroMetricBox}>
              <Text style={styles.heroMetricLabel}>У кошику</Text>
              <Text style={styles.heroMetricValue}>
                {isCartLoading ? '...' : cartTotals.itemsCount}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.catalogCard}>
          <Text style={styles.sectionLabel}>Каталог</Text>
          <Text style={styles.sectionTitle}>Пошук і фільтрація товарів</Text>
          <Text style={styles.sectionSubtitle}>
            Можна шукати за назвою, брендом або категорією, а також звужувати каталог за брендом і
            ціновим діапазоном.
          </Text>

          <View style={styles.searchCard}>
            <Text style={styles.searchLabel}>Пошук по каталогу</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Наприклад: iPhone, Apple, ноутбук"
              placeholderTextColor={colors.textMutedDark}
              style={styles.searchInput}
              selectionColor={colors.accent}
            />
            <View style={styles.resultsRow}>
              <Text style={styles.resultsText}>Знайдено: {resultsLabel}</Text>
              {appliedFiltersCount ? (
                <Pressable onPress={resetFilters}>
                  <Text style={styles.resetText}>Скинути все</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={styles.filterGroupLabel}>Категорія</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
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

          <Text style={styles.filterGroupLabel}>Бренд</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            <Pressable
              onPress={() => setActiveBrand('all')}
              style={({ pressed }) => [
                styles.brandChip,
                activeBrand === 'all' && styles.brandChipActive,
                pressed && styles.categoryChipPressed,
              ]}>
              <Text style={[styles.brandChipText, activeBrand === 'all' && styles.brandChipTextActive]}>
                Усі бренди
              </Text>
            </Pressable>

            {catalogBrands.map((brand) => {
              const isActive = activeBrand === brand;

              return (
                <Pressable
                  key={brand}
                  onPress={() => setActiveBrand(brand)}
                  style={({ pressed }) => [
                    styles.brandChip,
                    isActive && styles.brandChipActive,
                    pressed && styles.categoryChipPressed,
                  ]}>
                  <Text style={[styles.brandChipText, isActive && styles.brandChipTextActive]}>
                    {brand}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterGroupLabel}>Ціна</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            {catalogPriceFilters.map((priceFilter) => {
              const isActive = activePriceFilter === priceFilter.id;

              return (
                <Pressable
                  key={priceFilter.id}
                  onPress={() => setActivePriceFilter(priceFilter.id)}
                  style={({ pressed }) => [
                    styles.priceChip,
                    isActive && styles.priceChipActive,
                    pressed && styles.categoryChipPressed,
                  ]}>
                  <Text style={[styles.priceChipText, isActive && styles.priceChipTextActive]}>
                    {priceFilter.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.productsList}>
            {visibleProducts.length ? (
              visibleProducts.map((product) => {
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
              })
            ) : (
              <View style={styles.emptyResultsCard}>
                <Text style={styles.emptyResultsTitle}>Нічого не знайдено</Text>
                <Text style={styles.emptyResultsText}>
                  Спробуйте інший запит або скиньте фільтри, щоб повернути повний каталог.
                </Text>
                <PrimaryButton title="Скинути фільтри" onPress={resetFilters} variant="secondary" />
              </View>
            )}
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
              'Пошук і фільтрація вже працюють локально: можна відбирати товари за назвою, брендом, категорією та ціною.'}
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
  searchCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  searchInput: {
    marginTop: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '500',
  },
  resultsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultsText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMutedDark,
    fontWeight: '700',
  },
  resetText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.accentDark,
    fontWeight: '900',
  },
  filterGroupLabel: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  chipsRow: {
    marginTop: 12,
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
  brandChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#dde4ee',
  },
  brandChipActive: {
    backgroundColor: '#ebf3ff',
    borderColor: '#9ec4ff',
  },
  brandChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  brandChipTextActive: {
    color: '#1d5fbf',
  },
  priceChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#fff8e8',
    borderWidth: 1,
    borderColor: '#f5d78a',
  },
  priceChipActive: {
    backgroundColor: colors.warning,
    borderColor: '#f0b100',
  },
  priceChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  priceChipTextActive: {
    color: colors.textDark,
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
  emptyResultsCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
  },
  emptyResultsTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    color: colors.textDark,
  },
  emptyResultsText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
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
