import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../components/brand-mark';
import { PrimaryButton } from '../components/primary-button';
import { colors } from '../theme/colors';
import type { AuthSession } from '../types/auth';

type HomeScreenProps = {
  session: AuthSession;
  notice?: string;
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
  onOpenCart,
  onOpenProfile,
  onOpenChangePassword,
  onLogout,
}: HomeScreenProps) {
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
