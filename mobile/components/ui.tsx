import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextInput } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      {children}
    </Wrapper>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, styles[`button_${variant}`], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonText, variant === 'outline' && styles.outlineText]}>{title}</Text>
    </TouchableOpacity>
  );
}

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  multiline?: boolean;
  secureTextEntry?: boolean;
}

export function Input({ label, value, onChangeText, placeholder, keyboardType, multiline, secureTextEntry }: InputProps) {
  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.input, multiline && styles.multiline]}>
        <TextInput
          style={[styles.textInput, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  button_primary: { backgroundColor: Colors.primary },
  button_secondary: { backgroundColor: Colors.secondary },
  button_outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  button_danger: { backgroundColor: Colors.error },
  buttonText: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '600' },
  outlineText: { color: Colors.primary },
  disabled: { opacity: 0.5 },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '500' },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  multiline: { minHeight: 80 },
  inputText: {},
  textInput: {
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
});
