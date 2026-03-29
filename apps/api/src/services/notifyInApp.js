import { getPool } from '../db/pool.js';

export async function createNotification(userId, { type, title, body, link }) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body || null, link || null],
  );
}
