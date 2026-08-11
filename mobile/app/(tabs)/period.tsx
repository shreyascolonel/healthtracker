import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { AddLogModal } from '@/components/AddLogModal';
import { getRecords } from '@/lib/repository';

interface Period {
  id: string;
  start_date: string;
  end_date?: string;
  flow_level?: string;
  notes?: string;
}

export default function PeriodScreen() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [prediction, setPrediction] = useState<string>('');

  const loadPeriods = useCallback(async () => {
    const data = await getRecords<Period>('periods');
    setPeriods(data);

    if (data.length >= 2) {
      const cycles: number[] = [];
      for (let i = 0; i < Math.min(data.length - 1, 6); i++) {
        const curr = new Date(data[i].start_date);
        const prev = new Date(data[i + 1].start_date);
        cycles.push(Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)));
      }
      const avgCycle = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
      const lastStart = new Date(data[0].start_date);
      const nextPredicted = new Date(lastStart);
      nextPredicted.setDate(nextPredicted.getDate() + avgCycle);

      if (!data[0].end_date) {
        setPrediction(`Currently on day ${Math.floor((Date.now() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) + 1}`);
      } else {
        setPrediction(`Next predicted: ${nextPredicted.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} (avg ${avgCycle}-day cycle)`);
      }
    } else if (data.length === 1 && !data[0].end_date) {
      const day = Math.floor((Date.now() - new Date(data[0].start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setPrediction(`Currently on day ${day}`);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPeriods(); }, [loadPeriods]));

  const flowEmoji: Record<string, string> = { light: '💧', medium: '💧💧', heavy: '💧💧💧' };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.predictionCard}>
        <Text style={styles.predictionIcon}>🌸</Text>
        <Text style={styles.predictionText}>{prediction || 'Log your cycles to get predictions'}</Text>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Log Period Start</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Cycle History</Text>
      {periods.length === 0 ? (
        <Text style={styles.empty}>No cycles logged yet. Tap above to start tracking.</Text>
      ) : (
        periods.map((p) => {
          const start = new Date(p.start_date);
          const end = p.end_date ? new Date(p.end_date) : null;
          const duration = end
            ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
            : null;

          return (
            <View key={p.id} style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodDate}>
                  {start.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
                {!end && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
              </View>
              <View style={styles.periodDetails}>
                {p.flow_level && <Text style={styles.flowText}>{flowEmoji[p.flow_level] || ''} {p.flow_level} flow</Text>}
                {duration && <Text style={styles.durationText}>{duration} days</Text>}
                {p.notes && <Text style={styles.notesText}>{p.notes}</Text>}
              </View>
            </View>
          );
        })
      )}

      <AddLogModal
        visible={showModal}
        type="period"
        onClose={() => setShowModal(false)}
        onSaved={loadPeriods}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  predictionCard: {
    backgroundColor: Colors.period,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  predictionIcon: { fontSize: 40, marginBottom: 8 },
  predictionText: { fontSize: FontSize.lg, color: '#FFF', textAlign: 'center', fontWeight: '500' },
  addBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.period,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
  },
  addBtnText: { fontSize: FontSize.lg, color: Colors.period, fontWeight: '600' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  empty: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xl },
  periodCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  periodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodDate: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  activeBadge: { backgroundColor: Colors.period, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '600' },
  periodDetails: { marginTop: 8 },
  flowText: { fontSize: FontSize.md, color: Colors.textSecondary },
  durationText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 2 },
  notesText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
});
