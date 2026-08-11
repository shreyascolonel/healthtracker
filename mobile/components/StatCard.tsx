import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '@/constants/theme';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: string;
}

export function StatCard({ title, value, subtitle, color = Colors.primary, icon }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderLeftWidth: 4,
    flex: 1,
    minWidth: '45%',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 24, marginBottom: Spacing.xs },
  title: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  value: { fontSize: FontSize.xxl, fontWeight: '700', marginTop: 2 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
