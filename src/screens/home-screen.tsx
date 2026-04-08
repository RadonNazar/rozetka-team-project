import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/brand-mark';
import { PrimaryButton } from '../components/primary-button';
import { loadUserOrders } from '../storage/orders-storage';
import { colors } from '../theme/colors';
import type { AuthSession } from '../types/auth';
import type { UserOrder } from '../types/order';

type HomeScreenProps = {
  session: AuthSession;
  notice?: string;
  onOpenOrders: () => void;
  onOpenCart: () => void;
  onOpenProfile: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
};

const quickSections = [
  { title: 'Мої замовлення', text: 'Статуси, повторні покупки і доставка.' },
  { title: 'Обране', text: 'Збережені товари для швидкого повернення.' },
  { title: 'Бонуси', text: 'Персональні пропозиції та акції.' },
  { title: 'Підтримка', text: 'Допомога з оплатою, поверненням і замовленням.' },
];

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
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateOrders = async () => {
      setIsOrdersLoading(true);
      const storedOrders = await loadUserOrders(session.email);

      if (!isMounted) {
        return;
      }

      setOrders(storedOrders);
      setIsOrdersLoading(false);
    };

    void hydrateOrders();

    return () => {
      isMounted = false;
    };
  }, [session.email]);

  const latestOrder = orders[0] ?? null;
  const ordersTotalLabel = `${orders.length} ${orders.length === 1 ? 'замовлення' : 'замовлень'}`;
  const latestOrderDate = latestOrder
    ? new Date(latestOrder.createdAt).toLocaleString('uk-UA')
    : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBand} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <BrandMark subtitle="особистий кабінет" />

          <Text style={styles.heroTitle}>Вітаємо у вашому кабінеті</Text>
          <Text style={styles.heroSubtitle}>
            Тут зібрано ваші замовлення, бонуси, обране та основні інструменти покупця.
          </Text>
        </View>

        <View style={styles.sessionCard}>
          <Text style={styles.sectionLabel}>Активний користувач</Text>
          <Text style={styles.userEmail}>{session.email}</Text>
          <Text style={styles.sessionMeta}>
            Вхід виконано: {new Date(session.loggedInAt).toLocaleString('uk-UA')}
          </Text>
        </View>

        <View style={styles.ordersCard}>
          <Text style={styles.sectionLabel}>Замовлення користувача</Text>

          {isOrdersLoading ? (
            <View style={styles.ordersLoader}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : latestOrder ? (
            <>
              <View style={styles.orderMetricsRow}>
                <View style={styles.orderMetricBox}>
                  <Text style={styles.orderMetricLabel}>Усього</Text>
                  <Text style={styles.orderMetricValue}>{ordersTotalLabel}</Text>
                </View>
                <View style={styles.orderMetricBox}>
                  <Text style={styles.orderMetricLabel}>Останнє</Text>
                  <Text style={styles.orderMetricValue}>{latestOrder.orderNumber}</Text>
                </View>
              </View>

              <View style={styles.latestOrderCard}>
                <Text style={styles.latestOrderTitle}>Останнє оформлене замовлення</Text>
                <Text style={styles.latestOrderMeta}>
                  {latestOrder.totals.itemsCount} од. • {latestOrder.totals.subtotal.toLocaleString('uk-UA')} грн
                </Text>
                <Text style={styles.latestOrderMeta}>
                  {latestOrder.recipientCity} • {latestOrderDate}
                </Text>
                <Text style={styles.latestOrderStatus}>Статус: оформлено</Text>
              </View>
            </>
          ) : (
            <Text style={styles.ordersEmptyText}>
              Замовлень ще немає. Після оформлення з кошика тут відразу з’явиться остання покупка.
            </Text>
          )}
        </View>

        <View style={styles.grid}>
          {quickSections.map((item) => (
            <View key={item.title} style={styles.gridItem}>
              <Text style={styles.gridItemTitle}>{item.title}</Text>
              <Text style={styles.gridItemText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.sectionLabel}>{notice ? 'Остання дія' : 'Поточний статус'}</Text>
          <Text style={styles.noteText}>
            {notice ||
              'Вхід уже працює: сесія зберігається, а після повторного запуску користувач залишається в кабінеті.'}
          </Text>
        </View>

        <PrimaryButton title="Мої замовлення" onPress={onOpenOrders} />
        <View style={styles.actionsGap} />
        <PrimaryButton title="Мій кошик" onPress={onOpenCart} />
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
    height: 220,
    backgroundColor: colors.panelStrong,
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
  sessionCard: {
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accentDark,
  },
  userEmail: {
    marginTop: 10,
    fontSize: 26,
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
  ordersLoader: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderMetricsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  orderMetricBox: {
    flex: 1,
    minHeight: 86,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'space-between',
  },
  orderMetricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMutedDark,
  },
  orderMetricValue: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: colors.textDark,
  },
  latestOrderCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  latestOrderTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textDark,
  },
  latestOrderMeta: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMutedDark,
  },
  latestOrderStatus: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.success,
  },
  ordersEmptyText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMutedDark,
  },
  grid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    minHeight: 142,
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  gridItemTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textDark,
  },
  gridItemText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
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
