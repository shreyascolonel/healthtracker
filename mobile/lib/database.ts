import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('healthtracker.db');
    await initDatabase(db);
  }
  return db;
}

async function initDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS periods (
      id TEXT PRIMARY KEY,
      start_date TEXT NOT NULL,
      end_date TEXT,
      flow_level TEXT,
      symptoms TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY,
      weight_kg REAL NOT NULL,
      logged_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY,
      meal_type TEXT,
      description TEXT NOT NULL,
      calories INTEGER,
      logged_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      amount_ml INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS fitness_logs (
      id TEXT PRIMARY KEY,
      activity_type TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      liked INTEGER DEFAULT 0,
      intensity TEXT,
      notes TEXT,
      logged_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      time_of_day TEXT NOT NULL,
      days_of_week TEXT DEFAULT '[0,1,2,3,4,5,6]',
      enabled INTEGER DEFAULT 1,
      notification_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export type TableName =
  | 'periods'
  | 'weight_logs'
  | 'food_logs'
  | 'water_logs'
  | 'fitness_logs'
  | 'reminders';

export const ALL_TABLES: TableName[] = [
  'periods',
  'weight_logs',
  'food_logs',
  'water_logs',
  'fitness_logs',
  'reminders',
];
