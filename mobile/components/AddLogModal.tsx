import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { Button, Input } from './ui';
import { createRecord } from '@/lib/repository';

interface AddLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  type: 'period' | 'weight' | 'food' | 'water' | 'fitness';
}

export function AddLogModal({ visible, onClose, onSaved, type }: AddLogModalProps) {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Spacing.lg + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [weight, setWeight] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [waterMl, setWaterMl] = useState('250');
  const [activityType, setActivityType] = useState('Gym');
  const [duration, setDuration] = useState('');
  const [liked, setLiked] = useState(false);
  const [intensity, setIntensity] = useState('moderate');
  const [flowLevel, setFlowLevel] = useState('medium');
  const [notes, setNotes] = useState('');
  const [endDate, setEndDate] = useState<Date | null>(null);

  const reset = () => {
    setWeight('');
    setDescription('');
    setCalories('');
    setWaterMl('250');
    setDuration('');
    setNotes('');
    setLiked(false);
    setDate(new Date());
    setEndDate(null);
  };

  const handleSave = async () => {
    try {
      const loggedAt = date.toISOString();

      switch (type) {
        case 'weight':
          if (!weight) return Alert.alert('Error', 'Please enter weight');
          await createRecord('weight_logs', {
            weight_kg: parseFloat(weight),
            logged_at: loggedAt,
            notes: notes || null,
          });
          break;
        case 'food':
          if (!description) return Alert.alert('Error', 'Please enter food description');
          await createRecord('food_logs', {
            meal_type: mealType,
            description,
            calories: calories ? parseInt(calories) : null,
            logged_at: loggedAt,
            notes: notes || null,
          });
          break;
        case 'water':
          await createRecord('water_logs', {
            amount_ml: parseInt(waterMl) || 250,
            logged_at: loggedAt,
          });
          break;
        case 'fitness':
          if (!duration) return Alert.alert('Error', 'Please enter duration');
          await createRecord('fitness_logs', {
            activity_type: activityType,
            duration_minutes: parseInt(duration),
            liked: liked ? 1 : 0,
            intensity,
            notes: notes || null,
            logged_at: loggedAt,
          });
          break;
        case 'period':
          await createRecord('periods', {
            start_date: date.toISOString().split('T')[0],
            end_date: endDate ? endDate.toISOString().split('T')[0] : null,
            flow_level: flowLevel,
            symptoms: '[]',
            notes: notes || null,
          });
          break;
      }

      reset();
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
  };

  const titles: Record<string, string> = {
    period: 'Log Period',
    weight: 'Log Weight',
    food: 'Log Food',
    water: 'Log Water',
    fitness: 'Log Workout',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { paddingBottom: modalBottomPadding }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{titles[type]}</Text>

            {type !== 'period' && (
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
                <Text style={styles.dateText}>{date.toLocaleString()}</Text>
              </TouchableOpacity>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="datetime"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
              />
            )}

            {type === 'weight' && (
              <Input label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="65.5" />
            )}

            {type === 'food' && (
              <>
                <View style={styles.chipRow}>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, mealType === m && styles.chipActive]}
                      onPress={() => setMealType(m)}
                    >
                      <Text style={[styles.chipText, mealType === m && styles.chipTextActive]}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input label="What did you eat?" value={description} onChangeText={setDescription} placeholder="Grilled chicken salad" />
                <Input label="Calories (optional)" value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="450" />
              </>
            )}

            {type === 'water' && (
              <View style={styles.chipRow}>
                {['150', '250', '350', '500'].map((ml) => (
                  <TouchableOpacity
                    key={ml}
                    style={[styles.chip, waterMl === ml && styles.chipActive]}
                    onPress={() => setWaterMl(ml)}
                  >
                    <Text style={[styles.chipText, waterMl === ml && styles.chipTextActive]}>{ml}ml</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {type === 'fitness' && (
              <>
                <Input label="Activity" value={activityType} onChangeText={setActivityType} placeholder="Gym, Yoga, Running..." />
                <Input label="Duration (minutes)" value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="45" />
                <View style={styles.chipRow}>
                  {['low', 'moderate', 'high'].map((i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, intensity === i && styles.chipActive]}
                      onPress={() => setIntensity(i)}
                    >
                      <Text style={[styles.chipText, intensity === i && styles.chipTextActive]}>
                        {i.charAt(0).toUpperCase() + i.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.likeBtn} onPress={() => setLiked(!liked)}>
                  <Text style={styles.likeText}>{liked ? '❤️ Loved it!' : '🤍 Did you enjoy it?'}</Text>
                </TouchableOpacity>
              </>
            )}

            {type === 'period' && (
              <>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
                  <Text style={styles.label}>Start Date</Text>
                  <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <View style={styles.chipRow}>
                  {['light', 'medium', 'heavy'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, flowLevel === f && styles.chipActive]}
                      onPress={() => setFlowLevel(f)}
                    >
                      <Text style={[styles.chipText, flowLevel === f && styles.chipTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {(type === 'weight' || type === 'food' || type === 'fitness' || type === 'period') && (
              <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any notes..." />
            )}

            <View style={styles.actions}>
              <Button title="Cancel" onPress={() => { reset(); onClose(); }} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Save" onPress={handleSave} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  dateBtn: { backgroundColor: Colors.background, padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.md },
  dateText: { fontSize: FontSize.lg, color: Colors.text },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.md, color: Colors.text },
  chipTextActive: { color: '#FFF' },
  likeBtn: { padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md },
  likeText: { fontSize: FontSize.xl },
  actions: { flexDirection: 'row', marginTop: Spacing.md },
});
