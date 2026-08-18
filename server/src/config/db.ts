import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from './env.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: config.dbUrl,
});

pool.on('error', (err, _client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const db = drizzle({ client: pool });
export { pool };
export type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
