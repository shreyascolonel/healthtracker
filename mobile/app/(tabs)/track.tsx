import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { AddLogModal } from '@/components/AddLogModal';
import { getRecords } from '@/lib/repository';

type LogType = 'period' | 'weight' | 'food' | 'water' | 'fitness';

const CATEGORIES: { type: LogType; icon: string; label: string; color: string; desc: string }[] = [
  { type: 'water', icon: '💧', label: 'Water', color: Colors.water, desc: 'Log water intake' },
  { type: 'food', icon: '🍎', label: 'Food', color: Colors.food, desc: 'Log meals & snacks' },
  { type: 'fitness', icon: '🏋️', label: 'Fitness', color: Colors.fitness, desc: 'Gym, yoga, running...' },
  { type: 'weight', icon: '⚖️', label: 'Weight', color: Colors.weight, desc: 'Track your weight' },
  { type: 'period', icon: '🌸', label: 'Period', color: Colors.period, desc: 'Log cycle start/end' },
];

interface RecentLog {
  id: string;
  type: string;
  summary: string;
  time: string;
}

export default function TrackScreen() {
  const [modalType, setModalType] = useState<LogType | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

  const loadRecent = useCallback(async () => {
    const logs: RecentLog[] = [];

    const water = await getRecords<{ id: string; amount_ml: number; logged_at: string }>('water_logs');
    water.slice(0, 5).forEach((w) =>
      logs.push({ id: w.id, type: 'water', summary: `${w.amount_ml}ml water`, time: w.logged_at })
    );

    const food = await getRecords<{ id: string; description: string; meal_type: string; logged_at: string }>('food_logs');
    food.slice(0, 5).forEach((f) =>
      logs.push({ id: f.id, type: 'food', summary: `${f.meal_type}: ${f.description}`, time: f.logged_at })
    );

    const fitness = await getRecords<{ id: string; activity_type: string; duration_minutes: number; liked: number; logged_at: string }>('fitness_logs');
    fitness.slice(0, 5).forEach((f) =>
      logs.push({
        id: f.id,
        type: 'fitness',
        summary: `${f.activity_type} - ${f.duration_minutes}min${f.liked ? ' ❤️' : ''}`,
        time: f.logged_at,
      })
    );

    const weight = await getRecords<{ id: string; weight_kg: number; logged_at: string }>('weight_logs');
    weight.slice(0, 3).forEach((w) =>
      logs.push({ id: w.id, type: 'weight', summary: `${w.weight_kg} kg`, time: w.logged_at })
    );

    logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentLogs(logs.slice(0, 10));
  }, []);

  useFocusEffect(useCallback(() => { loadRecent(); }, [loadRecent]));

  const typeIcons: Record<string, string> = {
    water: '💧', food: '🍎', fitness: '🏋️', weight: '⚖️', period: '🌸',
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>What would you like to log?</Text>

      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.type}
            style={[styles.categoryCard, { borderLeftColor: cat.color }]}
            onPress={() => setModalType(cat.type)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            <Text style={styles.categoryDesc}>{cat.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {recentLogs.length > 0 && (
        <View style={styles.recent}>
          <Text style={styles.recentTitle}>Recent Logs</Text>
          {recentLogs.map((log) => (
            <View key={log.id} style={styles.recentItem}>
              <Text style={styles.recentIcon}>{typeIcons[log.type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentSummary}>{log.summary}</Text>
                <Text style={styles.recentTime}>
                  {new Date(log.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {modalType && (
        <AddLogModal
          visible={!!modalType}
          type={modalType}
          onClose={() => setModalType(null)}
          onSaved={loadRecent}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  heading: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  grid: { gap: Spacing.sm },
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
  },
  categoryIcon: { fontSize: 32, marginBottom: 4 },
  categoryLabel: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  categoryDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  recent: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
  recentTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  recentIcon: { fontSize: 24, marginRight: 12 },
  recentSummary: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  recentTime: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
