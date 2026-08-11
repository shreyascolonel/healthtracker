import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { Button, Input } from '@/components/ui';
import { getRecords, createRecord, updateRecord, softDelete } from '@/lib/repository';
import { rescheduleAllReminders, cancelReminder } from '@/lib/notifications';

interface Reminder {
  id: string;
  type: string;
  title: string;
  message?: string;
  time_of_day: string;
  days_of_week: string;
  enabled: number;
  notification_id?: string;
}

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState('water');
  const [newTime, setNewTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const load = useCallback(async () => {
    setReminders(await getRecords<Reminder>('reminders'));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleReminder = async (reminder: Reminder) => {
    const enabled = reminder.enabled ? 0 : 1;
    if (reminder.notification_id) {
      await cancelReminder(reminder.notification_id);
    }
    await updateRecord('reminders', reminder.id, { enabled });
    await rescheduleAllReminders();
    load();
  };

  const deleteReminder = (reminder: Reminder) => {
    Alert.alert('Delete Reminder', `Remove "${reminder.title}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (reminder.notification_id) await cancelReminder(reminder.notification_id);
          await softDelete('reminders', reminder.id);
          load();
        },
      },
    ]);
  };

  const addReminder = async () => {
    if (!newTitle) return Alert.alert('Error', 'Title is required');
    const hours = newTime.getHours().toString().padStart(2, '0');
    const minutes = newTime.getMinutes().toString().padStart(2, '0');

    await createRecord('reminders', {
      type: newType,
      title: newTitle,
      message: newMessage || null,
      time_of_day: `${hours}:${minutes}`,
      days_of_week: '[0,1,2,3,4,5,6]',
      enabled: 1,
    });

    await rescheduleAllReminders();
    setShowAdd(false);
    setNewTitle('');
    setNewMessage('');
    load();
  };

  const typeIcon: Record<string, string> = { water: '💧', food: '🍎', custom: '⏰' };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={Colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.subtitle}>Custom alarms for water, food, and more</Text>

      {reminders.map((r) => (
        <View key={r.id} style={styles.reminderCard}>
          <Text style={styles.reminderIcon}>{typeIcon[r.type] || '⏰'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>{r.title}</Text>
            <Text style={styles.reminderTime}>{r.time_of_day}</Text>
            {r.message && <Text style={styles.reminderMsg}>{r.message}</Text>}
          </View>
          <Switch
            value={!!r.enabled}
            onValueChange={() => toggleReminder(r)}
            trackColor={{ true: Colors.primaryLight }}
            thumbColor={r.enabled ? Colors.primary : '#CCC'}
          />
          <TouchableOpacity onPress={() => deleteReminder(r)} style={{ marginLeft: 8 }}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ))}

      <Button title="+ Add Reminder" onPress={() => setShowAdd(true)} variant="outline" style={{ marginTop: 12, marginBottom: 32 }} />

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Reminder</Text>

            <View style={styles.chipRow}>
              {['water', 'food', 'custom'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, newType === t && styles.chipActive]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.chipText, newType === t && styles.chipTextActive]}>
                    {typeIcon[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="Title" value={newTitle} onChangeText={setNewTitle} placeholder="Drink water" />
            <Input label="Message (optional)" value={newMessage} onChangeText={setNewMessage} placeholder="Stay hydrated!" />

            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeBtn}>
              <Text style={styles.timeLabel}>Time</Text>
              <Text style={styles.timeValue}>
                {newTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={newTime}
                mode="time"
                onChange={(_, d) => { setShowTimePicker(false); if (d) setNewTime(d); }}
              />
            )}

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowAdd(false)} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Save" onPress={addReminder} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, paddingTop: 48 },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.lg },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reminderIcon: { fontSize: 28, marginRight: 12 },
  reminderTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text },
  reminderTime: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '500' },
  reminderMsg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.md, color: Colors.text },
  chipTextActive: { color: '#FFF' },
  timeBtn: { backgroundColor: Colors.background, padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.md },
  timeLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  timeValue: { fontSize: FontSize.xl, color: Colors.text, fontWeight: '600', marginTop: 4 },
  modalActions: { flexDirection: 'row', marginTop: Spacing.md },
});
