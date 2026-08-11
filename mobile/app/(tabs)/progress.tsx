import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { ProgressChart } from '@/components/ProgressChart';
import { getRecords } from '@/lib/repository';

export default function ProgressScreen() {
  const [weightData, setWeightData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [waterData, setWaterData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [fitnessData, setFitnessData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [likedActivities, setLikedActivities] = useState<{ name: string; count: number }[]>([]);

  const loadCharts = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const weights = await getRecords<{ weight_kg: number; logged_at: string }>('weight_logs');
    const recentWeights = weights
      .filter((w) => new Date(w.logged_at) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

    setWeightData({
      labels: recentWeights.map((w) =>
        new Date(w.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      data: recentWeights.map((w) => w.weight_kg),
    });

    const water = await getRecords<{ amount_ml: number; logged_at: string }>('water_logs');
    const waterByDay: Record<string, number> = {};
    water
      .filter((w) => new Date(w.logged_at) >= thirtyDaysAgo)
      .forEach((w) => {
        const day = w.logged_at.split('T')[0];
        waterByDay[day] = (waterByDay[day] || 0) + w.amount_ml;
      });

    const waterDays = Object.keys(waterByDay).sort();
    setWaterData({
      labels: waterDays.map((d) =>
        new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      ),
      data: waterDays.map((d) => waterByDay[d]),
    });

    const fitness = await getRecords<{ activity_type: string; duration_minutes: number; liked: number; logged_at: string }>('fitness_logs');
    const fitnessByWeek: Record<string, number> = {};
    fitness
      .filter((f) => new Date(f.logged_at) >= thirtyDaysAgo)
      .forEach((f) => {
        const d = new Date(f.logged_at);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split('T')[0];
        fitnessByWeek[key] = (fitnessByWeek[key] || 0) + f.duration_minutes;
      });

    const fitnessWeeks = Object.keys(fitnessByWeek).sort();
    setFitnessData({
      labels: fitnessWeeks.map((w) => `W${new Date(w).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`),
      data: fitnessWeeks.map((w) => fitnessByWeek[w]),
    });

    const liked: Record<string, number> = {};
    fitness.filter((f) => f.liked).forEach((f) => {
      liked[f.activity_type] = (liked[f.activity_type] || 0) + 1;
    });
    setLikedActivities(
      Object.entries(liked)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    );
  }, []);

  useFocusEffect(useCallback(() => { loadCharts(); }, [loadCharts]));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Your Progress</Text>
      <Text style={styles.subheading}>Last 30 days overview</Text>

      <ProgressChart
        title="Weight Trend"
        labels={weightData.labels}
        data={weightData.data}
        color={Colors.weight}
        unit="kg"
        type="line"
      />

      <ProgressChart
        title="Daily Water Intake"
        labels={waterData.labels}
        data={waterData.data}
        color={Colors.water}
        unit="ml"
        type="bar"
      />

      <ProgressChart
        title="Weekly Workout Minutes"
        labels={fitnessData.labels}
        data={fitnessData.data}
        color={Colors.fitness}
        unit="min"
        type="bar"
      />

      {likedActivities.length > 0 && (
        <View style={styles.likedCard}>
          <Text style={styles.likedTitle}>❤️ Favorite Activities</Text>
          {likedActivities.map((a) => (
            <View key={a.name} style={styles.likedRow}>
              <Text style={styles.likedName}>{a.name}</Text>
              <Text style={styles.likedCount}>{a.count}x loved</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  heading: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
  subheading: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.md },
  likedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  likedTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  likedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  likedName: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
  likedCount: { fontSize: FontSize.md, color: Colors.primary },
});
