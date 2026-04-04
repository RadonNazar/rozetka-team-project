import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from '../theme/colors';

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, style, ...props }: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.textMutedDark}
        selectionColor={colors.accent}
        onFocus={(event) => {
          setIsFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          props.onBlur?.(event);
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: colors.textMutedDark,
  },
  input: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardMuted,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textDark,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#fff7f7',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMutedDark,
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    fontWeight: '600',
  },
});
