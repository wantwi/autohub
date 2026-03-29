import { Router } from 'express';
import { getPool } from '../../db/pool.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { keysToCamel } from '../../lib/format.js';
import { HttpError } from '../../lib/httpError.js';

const router = Router();

const VALID_REASONS = ['spam', 'harassment', 'scam', 'inappropriate', 'fake_profile', 'other'];

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { reportedUserId, conversationId, reason, details } = req.body;
    if (!reportedUserId || !reason) {
      throw new HttpError(400, 'BAD_REQUEST', 'reportedUserId and reason are required');
    }
    if (!VALID_REASONS.includes(reason)) {
      throw new HttpError(400, 'BAD_REQUEST', `reason must be one of: ${VALID_REASONS.join(', ')}`);
    }
    if (reportedUserId === req.user.id) {
      throw new HttpError(400, 'BAD_REQUEST', 'Cannot report yourself');
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, conversation_id, reason, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, reportedUserId, conversationId || null, reason, details || null],
    );
    res.status(201).json({ data: keysToCamel(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const status = req.query.status || 'pending';
    const { rows } = await pool.query(
      `SELECT r.*, 
              reporter.full_name AS reporter_name,
              reported.full_name AS reported_name
       FROM reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       JOIN users reported ON reported.id = r.reported_user_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [status],
    );
    res.json({ data: rows.map(keysToCamel) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      throw new HttpError(400, 'BAD_REQUEST', 'Invalid status');
    }
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE reports SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Report not found');
    res.json({ data: keysToCamel(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
