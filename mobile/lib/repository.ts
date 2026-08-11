import uuid from 'react-native-uuid';
import { getDatabase, TableName } from './database';
import type { SQLiteBindValue } from 'expo-sqlite';

function now(): string {
  return new Date().toISOString();
}

function toBindValue(val: unknown): SQLiteBindValue {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return val as SQLiteBindValue;
}

export async function createRecord<T extends Record<string, unknown>>(
  table: TableName,
  data: Omit<T, 'id' | 'created_at' | 'updated_at' | 'synced'>
): Promise<T & { id: string }> {
  const db = await getDatabase();
  const id = uuid.v4() as string;
  const timestamp = now();
  const record = {
    ...data,
    id,
    created_at: timestamp,
    updated_at: timestamp,
    synced: 0,
  };

  const keys = Object.keys(record);
  const placeholders = keys.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    ...keys.map((k) => toBindValue(record[k as keyof typeof record]))
  );

  return record as unknown as T & { id: string };
}

export async function updateRecord(
  table: TableName,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDatabase();
  const timestamp = now();
  const keys = Object.keys(data);
  const sets = keys.map((k) => `${k} = ?`).join(', ');

  await db.runAsync(
    `UPDATE ${table} SET ${sets}, updated_at = ?, synced = 0 WHERE id = ?`,
    ...keys.map((k) => toBindValue(data[k])),
    timestamp,
    id
  );
}

export async function softDelete(table: TableName, id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${table} SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?`,
    now(),
    now(),
    id
  );
}

export async function getRecords<T>(
  table: TableName,
  where?: string,
  params?: unknown[]
): Promise<T[]> {
  const db = await getDatabase();
  const sql = `SELECT * FROM ${table} WHERE deleted_at IS NULL${where ? ` AND ${where}` : ''} ORDER BY updated_at DESC`;
  return db.getAllAsync<T>(sql, ...(params || []) as SQLiteBindValue[]);
}

export async function getUnsyncedRecords(table: TableName): Promise<Record<string, unknown>[]> {
  const db = await getDatabase();
  return db.getAllAsync(`SELECT * FROM ${table} WHERE synced = 0`);
}

export async function markSynced(table: TableName, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE ${table} SET synced = 1 WHERE id IN (${placeholders})`,
    ...ids
  );
}

export async function upsertFromServer(
  table: TableName,
  record: Record<string, unknown>
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ updated_at: string }>(
    `SELECT updated_at FROM ${table} WHERE id = ?`,
    record.id as string
  );

  if (existing) {
    const serverTime = new Date(record.updated_at as string).getTime();
    const localTime = new Date(existing.updated_at).getTime();
    if (localTime >= serverTime) return;
  }

  const keys = Object.keys(record);
  const placeholders = keys.map(() => '?').join(', ');
  const updates = keys.map((k) => `${k} = ?`).join(', ');

  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}, synced = 1`,
    ...keys.map((k) => toBindValue(record[k])),
    ...keys.map((k) => toBindValue(record[k]))
  );
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    key,
    value
  );
}
