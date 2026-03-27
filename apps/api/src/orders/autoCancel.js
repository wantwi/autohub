import { getPool } from '../db/pool.js';

/** Auto-cancel paid pending orders past confirm_deadline_at (PRD US-08). */
export async function runAutoCancelPendingOrders() {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE orders
     SET status = 'cancelled', updated_at = now()
     WHERE status = 'pending'
       AND payment_status = 'paid'
       AND confirm_deadline_at IS NOT NULL
       AND confirm_deadline_at < now()
     RETURNING id`
  );
  for (const row of rows) {
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, note) VALUES ($1, 'cancelled', $2)`,
      [row.id, 'auto_cancel_deadline']
    );
  }
}
