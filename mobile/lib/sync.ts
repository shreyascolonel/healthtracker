import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_TABLES } from './database';
import {
  getUnsyncedRecords,
  markSynced,
  upsertFromServer,
  getSyncMeta,
  setSyncMeta,
} from './repository';

const API_URL_KEY = 'api_url';
const AUTH_TOKEN_KEY = 'auth_token';

export async function getApiUrl(): Promise<string | null> {
  return AsyncStorage.getItem(API_URL_KEY);
}

export async function setApiUrl(url: string): Promise<void> {
  const cleaned = url.replace(/\/+$/, '');
  await AsyncStorage.setItem(API_URL_KEY, cleaned);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY]);
}

export async function login(
  apiUrl: string,
  email: string,
  password: string
): Promise<{ name: string; email: string }> {
  await setApiUrl(apiUrl);
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }

  const data = await response.json();
  await setAuthToken(data.token);
  return data.user;
}

export async function syncData(): Promise<{ applied: number; conflicts: number }> {
  const apiUrl = await getApiUrl();
  const token = await getAuthToken();
  if (!apiUrl || !token) throw new Error('Not configured');

  const lastSync = await getSyncMeta('last_sync');

  const pullResponse = await fetch(
    `${apiUrl}/api/sync/pull${lastSync ? `?since=${encodeURIComponent(lastSync)}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!pullResponse.ok) throw new Error('Pull sync failed');
  const pullData = await pullResponse.json();

  for (const table of ALL_TABLES) {
    const records = pullData.data[table] || [];
    for (const record of records) {
      await upsertFromServer(table, { ...record, synced: 1 });
    }
  }

  const changes: Record<string, Record<string, unknown>[]> = {};
  for (const table of ALL_TABLES) {
    const unsynced = await getUnsyncedRecords(table);
    if (unsynced.length) changes[table] = unsynced;
  }

  let applied = 0;
  let conflicts = 0;

  if (Object.keys(changes).length > 0) {
    const pushResponse = await fetch(`${apiUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ changes }),
    });

    if (!pushResponse.ok) throw new Error('Push sync failed');
    const pushData = await pushResponse.json();

    for (const key of pushData.applied || []) {
      const [table, id] = key.split(':');
      await markSynced(table as typeof ALL_TABLES[number], [id]);
      applied++;
    }

    for (const conflict of pushData.conflicts || []) {
      await upsertFromServer(conflict.table, { ...conflict.serverRecord, synced: 1 });
      conflicts++;
    }
  } else {
    for (const table of ALL_TABLES) {
      const unsynced = await getUnsyncedRecords(table);
      if (unsynced.length) {
        await markSynced(table, unsynced.map((r) => r.id as string));
      }
    }
  }

  await setSyncMeta('last_sync', pullData.serverTime);
  return { applied, conflicts };
}

export async function checkHealth(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
