require('dotenv').config();
const dishes = require('../db/dishes.json');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Configure it in .env first.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  try {
    if (process.argv.includes('--reset')) {
      await pool.query('TRUNCATE TABLE dishes');
    }
    for (const d of dishes) {
      await pool.query(
        `INSERT INTO dishes (dish_id, dish_name, image_url, is_published, version)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (dish_id) DO NOTHING`,
        [d.dishId, d.dishName, d.imageUrl, d.isPublished]
      );
    }
    console.log(`Seed complete (${dishes.length} dishes processed${process.argv.includes('--reset') ? ', reset mode' : ''}).`);
  } finally {
    await pool.end();
  }
}
main().catch((err) => { console.error('[seed]', err.message); process.exit(1); });
