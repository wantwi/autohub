import { Router } from 'express';
import { getPool } from '../../db/pool.js';
import { requireAuth } from '../../middleware/auth.js';
import { keysToCamel } from '../../lib/format.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, pageSize, offset],
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1`, [req.user.id]),
    ]);

    res.json({
      data: rows.map(keysToCamel),
      meta: { page, pageSize, total: countRows[0].total },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id],
    );
    res.json({ data: { count: rows[0].count } });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id],
    );
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
