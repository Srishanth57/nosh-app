require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Configure it in .env first.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    console.log('Migration complete: dishes table is ready.');
  } finally {
    await pool.end();
  }
}
main().catch((err) => { console.error('[migrate]', err.message); process.exit(1); });
