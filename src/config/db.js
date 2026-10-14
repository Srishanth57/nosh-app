import { Pool } from 'pg';

const globalForPg = globalThis;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set. Add it to .env.local before using the API.');
}

const poolOptions = {
  connectionString,
  // Set DB_SSL=true for hosted PostgreSQL providers such as Supabase.
  ...(process.env.DB_SSL === 'true'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

export const pool = globalForPg.__noshDishPool ?? (globalForPg.__noshDishPool = new Pool(poolOptions));
pool.on('error', (err) => console.error('[db] idle client error:', err.message));
