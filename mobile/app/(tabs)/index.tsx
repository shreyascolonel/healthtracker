import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { StatCard } from '@/components/StatCard';
import { getRecords } from '@/lib/repository';
import { syncData, getAuthToken } from '@/lib/sync';

interface WaterLog { amount_ml: number; logged_at: string }
interface FoodLog { logged_at: string }
interface FitnessLog { duration_minutes: number; liked: number; logged_at: string }
interface WeightLog { weight_kg: number; logged_at: string }
interface Period { start_date: string; end_date?: string }

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [todayWater, setTodayWater] = useState(0);
  const [todayMeals, setTodayMeals] = useState(0);
  const [todayFitness, setTodayFitness] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [cycleDay, setCycleDay] = useState<string>('—');
  const [syncStatus, setSyncStatus] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    const water = await getRecords<WaterLog>('water_logs');
    const food = await getRecords<FoodLog>('food_logs');
    const fitness = await getRecords<FitnessLog>('fitness_logs');
    const weight = await getRecords<WeightLog>('weight_logs');
    const periods = await getRecords<Period>('periods');

    setTodayWater(
      water.filter((w) => w.logged_at.startsWith(today)).reduce((s, w) => s + w.amount_ml, 0)
    );
    setTodayMeals(food.filter((f) => f.logged_at.startsWith(today)).length);
    setTodayFitness(
      fitness.filter((f) => f.logged_at.startsWith(today)).reduce((s, f) => s + f.duration_minutes, 0)
    );
    setLatestWeight(weight.length ? weight[0].weight_kg : null);

    if (periods.length) {
      const last = periods[0];
      const start = new Date(last.start_date);
      const diff = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setCycleDay(last.end_date ? 'Not in cycle' : `Day ${diff}`);
    }
  }, [today]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await getAuthToken();
      if (token) {
        const result = await syncData();
        setSyncStatus(`Synced ${result.applied} changes`);
      }
    } catch {
      setSyncStatus('Offline mode');
    }
    await loadData();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()} 💕</Text>
          <Text style={styles.subtitle}>Here's your health summary</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {syncStatus ? <Text style={styles.syncStatus}>{syncStatus}</Text> : null}

      <View style={styles.statsGrid}>
        <StatCard title="Water Today" value={`${todayWater}ml`} subtitle="Goal: 2000ml" color={Colors.water} icon="💧" />
        <StatCard title="Meals Today" value={`${todayMeals}`} subtitle="Keep it balanced" color={Colors.food} icon="🍎" />
        <StatCard title="Workout" value={`${todayFitness}min`} subtitle="Stay active!" color={Colors.fitness} icon="💪" />
        <StatCard title="Weight" value={latestWeight ? `${latestWeight}kg` : '—'} subtitle="Latest reading" color={Colors.weight} icon="⚖️" />
      </View>

      <View style={styles.cycleCard}>
        <Text style={styles.cycleIcon}>🌸</Text>
        <View>
          <Text style={styles.cycleTitle}>Cycle Status</Text>
          <Text style={styles.cycleValue}>{cycleDay}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/period')}>
          <Ionicons name="chevron-forward" size={24} color={Colors.period} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Log</Text>
        <View style={styles.actionRow}>
          {[
            { icon: '💧', label: 'Water', route: '/(tabs)/track' },
            { icon: '🍽️', label: 'Food', route: '/(tabs)/track' },
            { icon: '🏋️', label: 'Gym', route: '/(tabs)/track' },
            { icon: '⚖️', label: 'Weight', route: '/(tabs)/track' },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} onPress={() => router.push(a.route as any)}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.reminderBanner} onPress={() => router.push('/reminders')}>
        <Ionicons name="alarm-outline" size={24} color={Colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.reminderTitle}>Reminders</Text>
          <Text style={styles.reminderSub}>Manage water & food alarms</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: FontSize.xxl, fontWeight: '700', color: '#FFF' },
  subtitle: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  settingsBtn: { padding: 8 },
  syncStatus: { textAlign: 'center', color: Colors.textSecondary, fontSize: FontSize.sm, padding: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: 8 },
  cycleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  cycleIcon: { fontSize: 32, marginRight: 12 },
  cycleTitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cycleValue: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.period },
  quickActions: { padding: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    width: '23%',
  },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: FontSize.sm, color: Colors.text, marginTop: 4, fontWeight: '500' },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.xl,
  },
  reminderTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  reminderSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
