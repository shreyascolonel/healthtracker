import pg from 'pg';

function buildConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER || 'healthtracker';
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD || 'changeme');
  const host = process.env.POSTGRES_HOST || 'postgres';
  const port = process.env.POSTGRES_PORT || '5432';
  const database = process.env.POSTGRES_DB || 'healthtracker';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const pool = new pg.Pool({
  connectionString: buildConnectionString(),
});

export default pool;

export async function waitForDatabase(retries = 30, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established.');
      return;
    } catch (err) {
      console.log(`Waiting for database... (${attempt}/${retries})`);
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
