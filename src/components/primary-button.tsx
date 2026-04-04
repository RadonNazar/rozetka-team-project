import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && (isSecondary ? styles.buttonSecondaryPressed : styles.buttonPressed),
      ]}>
      <Text
        style={[
          styles.label,
          isSecondary && styles.labelSecondary,
          disabled && styles.labelDisabled,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: colors.accentDark,
  },
  buttonSecondaryPressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: '#e8efe9',
  },
  buttonDisabled: {
    backgroundColor: colors.accentMuted,
    shadowOpacity: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#ffffff',
  },
  labelSecondary: {
    color: colors.textDark,
  },
  labelDisabled: {
    color: '#f3faf5',
  },
});
