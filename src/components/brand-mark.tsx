import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type BrandMarkProps = {
  tone?: 'light' | 'dark';
  subtitle?: string;
};

export function BrandMark({
  tone = 'light',
  subtitle = 'інтернет-магазин',
}: BrandMarkProps) {
  const isLight = tone === 'light';

  return (
    <View style={styles.row}>
      <View style={[styles.symbol, !isLight && styles.symbolDark]}>
        <View style={styles.ring} />
        <View style={styles.dot} />
        <View style={styles.smile} />
      </View>

      <View>
        <Text style={[styles.title, !isLight && styles.titleDark]}>ROZETKA</Text>
        <Text style={[styles.caption, !isLight && styles.captionDark]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  symbol: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
  },
  symbolDark: {
    backgroundColor: '#f1f8f3',
  },
  ring: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  dot: {
    marginTop: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  smile: {
    position: 'absolute',
    bottom: 12,
    width: 18,
    height: 9,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: 3,
    borderColor: colors.accent,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.4,
    color: colors.textLight,
  },
  titleDark: {
    color: colors.textDark,
  },
  caption: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMutedLight,
  },
  captionDark: {
    color: colors.textMutedDark,
  },
});
