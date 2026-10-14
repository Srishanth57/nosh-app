import { pool } from '@/config/db';

const COLUMNS = 'dish_id, dish_name, image_url, is_published, version';
const toDto = (r) => ({
  dishId: r.dish_id,
  dishName: r.dish_name,
  imageUrl: r.image_url,
  isPublished: r.is_published,
  version: Number(r.version),
});

export async function findAll() {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM dishes ORDER BY length(dish_id), dish_id`
  );
  return rows.map(toDto);
}

export async function findById(dishId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM dishes WHERE dish_id = $1`, [dishId]
  );
  return rows[0] ? toDto(rows[0]) : null;
}

// Version comparison and update are one atomic SQL statement.
export async function updateIfVersion(dishId, dishName, isPublished, expectedVersion) {
  const { rows } = await pool.query(
    `UPDATE dishes
       SET dish_name = $1, is_published = $2, version = version + 1
     WHERE dish_id = $3 AND version = $4
     RETURNING ${COLUMNS}`,
    [dishName, isPublished, dishId, expectedVersion]
  );
  return rows[0] ? toDto(rows[0]) : null;
}
