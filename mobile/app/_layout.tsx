import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '@/lib/database';
import { requestNotificationPermissions, setupDefaultReminders } from '@/lib/notifications';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      await getDatabase();
      const granted = await requestNotificationPermissions();
      if (granted) await setupDefaultReminders();
      setReady(true);
    }
    init();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reminders" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
