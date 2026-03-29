import { Router } from 'express';
import { getPool } from '../../db/pool.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE role = 'buyer') AS buyers,
        (SELECT COUNT(*)::int FROM users WHERE role = 'dealer') AS dealers,
        (SELECT COUNT(*)::int FROM users WHERE role = 'technician') AS technicians,
        (SELECT COUNT(*)::int FROM dealers) AS dealer_shops,
        (SELECT COUNT(*)::int FROM technicians) AS technician_profiles,
        (SELECT COUNT(*)::int FROM parts) AS total_parts,
        (SELECT COUNT(*)::int FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_price)::numeric, 0) FROM orders WHERE payment_status = 'paid') AS total_revenue,
        (SELECT COUNT(*)::int FROM service_requests) AS total_bookings,
        (SELECT COUNT(*)::int FROM service_requests WHERE status = 'pending') AS pending_bookings,
        (SELECT COUNT(*)::int FROM service_requests WHERE status = 'completed') AS completed_bookings,
        (SELECT COUNT(*)::int FROM conversations) AS total_conversations,
        (SELECT COUNT(*)::int FROM messages) AS total_messages,
        (SELECT COUNT(*)::int FROM reports WHERE status = 'pending') AS pending_reports,
        (SELECT COUNT(*)::int FROM feedback) AS total_feedback
    `);

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/signups', async (req, res, next) => {
  try {
    const pool = getPool();
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const { rows } = await pool.query(`
      SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= now() - ($1 || ' days')::interval
      GROUP BY day ORDER BY day
    `, [days]);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings-by-status', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM service_requests
      GROUP BY status ORDER BY count DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
