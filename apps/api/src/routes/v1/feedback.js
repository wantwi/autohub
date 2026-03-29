import { Router } from 'express';
import { getPool } from '../../db/pool.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { keysToCamel } from '../../lib/format.js';
import { HttpError } from '../../lib/httpError.js';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { type, message, contactInfo } = req.body;
    if (!message?.trim()) {
      throw new HttpError(400, 'BAD_REQUEST', 'message is required');
    }
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO feedback (user_id, type, message, contact_info) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, type || 'general', message.trim(), contactInfo || null],
    );
    res.status(201).json({ data: keysToCamel(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT f.*, u.full_name, u.phone FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC LIMIT 100`,
    );
    res.json({ data: rows.map(keysToCamel) });
  } catch (err) {
    next(err);
  }
});

export default router;
