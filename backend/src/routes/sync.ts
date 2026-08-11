import { Router } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const TABLES = [
  'periods',
  'weight_logs',
  'food_logs',
  'water_logs',
  'fitness_logs',
  'reminders',
] as const;

type TableName = (typeof TABLES)[number];

interface SyncRecord {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
  [key: string]: unknown;
}

router.get('/pull', async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const since = req.query.since as string | undefined;

  const result: Record<string, SyncRecord[]> = {};

  for (const table of TABLES) {
    let sql = `SELECT * FROM ${table} WHERE user_id = $1`;
    const params: unknown[] = [userId];

    if (since) {
      sql += ` AND updated_at > $2`;
      params.push(since);
    }

    sql += ' ORDER BY updated_at ASC';
    result[table] = await query<SyncRecord>(sql, params);
  }

  res.json({ data: result, serverTime: new Date().toISOString() });
});

router.post('/push', async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { changes } = req.body as { changes: Record<string, SyncRecord[]> };

  if (!changes) {
    return res.status(400).json({ error: 'No changes provided' });
  }

  const conflicts: { table: string; id: string; serverRecord: SyncRecord }[] = [];
  const applied: string[] = [];

  for (const table of TABLES) {
    const records = changes[table];
    if (!records?.length) continue;

    for (const record of records) {
      const existing = await query<SyncRecord>(
        `SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`,
        [record.id, userId]
      );

      if (existing.length > 0) {
        const serverUpdated = new Date(existing[0].updated_at).getTime();
        const clientUpdated = new Date(record.updated_at as string).getTime();

        if (serverUpdated > clientUpdated) {
          conflicts.push({ table, id: record.id, serverRecord: existing[0] });
          continue;
        }
      }

      await upsertRecord(table, userId, record);
      applied.push(`${table}:${record.id}`);
    }
  }

  res.json({ applied, conflicts, serverTime: new Date().toISOString() });
});

async function upsertRecord(table: TableName, userId: string, record: SyncRecord) {
  const { id, ...fields } = record;
  const columns = Object.keys(fields);
  const values = Object.values(fields);
  const placeholders = columns.map((_, i) => `$${i + 3}`).join(', ');
  const updates = columns.map((col, i) => `${col} = $${i + 3}`).join(', ');

  const sql = `
    INSERT INTO ${table} (id, user_id, ${columns.join(', ')})
    VALUES ($1, $2, ${placeholders})
    ON CONFLICT (id) DO UPDATE SET ${updates}, user_id = $2
  `;

  await query(sql, [id, userId, ...values]);
}

export default router;
