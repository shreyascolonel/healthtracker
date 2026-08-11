import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { Button, Input } from '@/components/ui';
import { login, checkHealth } from '@/lib/sync';

export default function LoginScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState('https://health.yourdomain.com');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!apiUrl || !email || !password) {
      return Alert.alert('Error', 'Please fill in all fields');
    }

    setLoading(true);
    try {
      const healthy = await checkHealth(apiUrl);
      if (!healthy) {
        Alert.alert('Connection Failed', 'Could not reach the server. Check your URL and network.');
        setLoading(false);
        return;
      }

      const user = await login(apiUrl, email, password);
      Alert.alert('Welcome!', `Logged in as ${user.name}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Connect to Server</Text>
        <Text style={styles.subtitle}>
          Enter your NAS server URL (via reverse proxy) and login credentials
        </Text>

        <Input
          label="Server URL"
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://health.yourdomain.com"
        />
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="wife@home.local" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />

        <Button title={loading ? 'Connecting...' : 'Login & Sync'} onPress={handleLogin} disabled={loading} />

        <Text style={styles.hint}>
          The app works offline too. Data syncs when connected to your home server.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.lg, paddingTop: 60 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.lg },
  hint: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg },
});
