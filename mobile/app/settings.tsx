import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { Button } from '@/components/ui';
import { getApiUrl, getAuthToken, syncData, clearAuth } from '@/lib/sync';
import { getSyncMeta } from '@/lib/repository';

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      setApiUrl(await getApiUrl());
      setIsLoggedIn(!!(await getAuthToken()));
      setLastSync(await getSyncMeta('last_sync'));
    }
    load();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncData();
      setLastSync(new Date().toISOString());
      Alert.alert('Sync Complete', `Applied ${result.applied} changes${result.conflicts ? `, ${result.conflicts} conflicts resolved` : ''}`);
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message);
    }
    setSyncing(false);
  };

  const handleLogout = async () => {
    await clearAuth();
    setIsLoggedIn(false);
    Alert.alert('Logged out', 'You can still use the app offline.');
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={Colors.text} />
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Connection</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: isLoggedIn ? Colors.success : Colors.textSecondary }]}>
            {isLoggedIn ? 'Connected' : 'Offline'}
          </Text>
        </View>
        {apiUrl && (
          <View style={styles.row}>
            <Text style={styles.label}>Server</Text>
            <Text style={styles.value} numberOfLines={1}>{apiUrl}</Text>
          </View>
        )}
        {lastSync && (
          <View style={styles.row}>
            <Text style={styles.label}>Last Sync</Text>
            <Text style={styles.value}>{new Date(lastSync).toLocaleString()}</Text>
          </View>
        )}

        {!isLoggedIn ? (
          <Button title="Connect to Server" onPress={() => router.push('/login')} style={{ marginTop: 12 }} />
        ) : (
          <View style={{ gap: 8, marginTop: 12 }}>
            <Button title={syncing ? 'Syncing...' : 'Sync Now'} onPress={handleSync} disabled={syncing} />
            <Button title="Logout" onPress={handleLogout} variant="outline" />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/reminders')}>
          <Ionicons name="alarm-outline" size={24} color={Colors.primary} />
          <Text style={styles.linkText}>Manage Water & Food Alarms</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>Health Tracker v1.0.0</Text>
        <Text style={styles.aboutText}>Personal health tracking with offline support</Text>
        <Text style={styles.aboutText}>Data stored locally and synced to your NAS</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, paddingTop: 48 },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: FontSize.md, color: Colors.textSecondary },
  value: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500', maxWidth: '60%' },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  linkText: { flex: 1, fontSize: FontSize.md, color: Colors.text, marginLeft: 12 },
  aboutText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
});
