import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(5000).optional().nullable(),
});

const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(5000).optional().nullable(),
});

const replySchema = z.object({
  comment: z.string().min(1).max(5000),
});

const reactSchema = z.object({
  reaction: z.enum(['like', 'dislike']),
});

/**
 * Optional auth: attaches req.user if a valid token is present, but doesn't
 * fail if missing. Used so GET endpoints can show "my reaction" for logged-in
 * users while still being public.
 */
async function optionalAuth(req, _res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return next();
    const { verifyAccessToken } = await import('../../lib/jwt.js');
    const payload = verifyAccessToken(h.slice(7));
    const pool = getPool();
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [payload.jti]);
    if (!r.rowCount) {
      req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
    }
    next();
  } catch {
    next();
  }
}

// ─── GET /technicians/:technicianId/reviews ─────────────────────────────────
router.get('/technicians/:technicianId/reviews', optionalAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const technicianId = req.params.technicianId;

    const { rows: techCheck } = await pool.query('SELECT id FROM technicians WHERE id = $1', [technicianId]);
    if (!techCheck.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');

    const { rows: reviews } = await pool.query(
      `SELECT r.*,
              u.full_name AS buyer_name,
              (SELECT COUNT(*)::int FROM technician_review_reactions rr WHERE rr.review_id = r.id AND rr.reaction = 'like') AS like_count,
              (SELECT COUNT(*)::int FROM technician_review_reactions rr WHERE rr.review_id = r.id AND rr.reaction = 'dislike') AS dislike_count
       FROM technician_reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.technician_id = $1
       ORDER BY r.created_at DESC`,
      [technicianId],
    );

    const reviewIds = reviews.map((r) => r.id);

    let repliesMap = {};
    if (reviewIds.length) {
      const { rows: replies } = await pool.query(
        `SELECT rr.*, u.full_name AS author_name
         FROM technician_review_replies rr
         JOIN users u ON u.id = rr.user_id
         WHERE rr.review_id = ANY($1)
         ORDER BY rr.created_at ASC`,
        [reviewIds],
      );
      for (const rep of replies) {
        if (!repliesMap[rep.review_id]) repliesMap[rep.review_id] = [];
        repliesMap[rep.review_id].push(keysToCamel(rep));
      }
    }

    let myReactions = {};
    if (req.user && reviewIds.length) {
      const { rows: reactions } = await pool.query(
        `SELECT review_id, reaction FROM technician_review_reactions
         WHERE review_id = ANY($1) AND user_id = $2`,
        [reviewIds, req.user.id],
      );
      for (const r of reactions) {
        myReactions[r.review_id] = r.reaction;
      }
    }

    const data = reviews.map((r) => ({
      ...keysToCamel(r),
      replies: repliesMap[r.id] || [],
      myReaction: myReactions[r.id] || null,
    }));

    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// ─── POST /technicians/:technicianId/reviews ─────────────────────────────────
router.post('/technicians/:technicianId/reviews', requireAuth, async (req, res, next) => {
  try {
    const body = createReviewSchema.parse(req.body);
    const pool = getPool();
    const technicianId = req.params.technicianId;

    const { rows: techRows } = await pool.query(
      'SELECT id, user_id FROM technicians WHERE id = $1',
      [technicianId],
    );
    if (!techRows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');

    if (techRows[0].user_id === req.user.id) {
      throw new HttpError(400, 'SELF_REVIEW', 'You cannot review your own profile');
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO technician_reviews (technician_id, buyer_id, rating, comment)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [technicianId, req.user.id, body.rating, body.comment ?? null],
      );
      const review = rows[0];

      const { rows: userRow } = await pool.query(
        'SELECT full_name FROM users WHERE id = $1',
        [req.user.id],
      );

      res.status(201).json({
        data: {
          ...keysToCamel(review),
          buyerName: userRow[0]?.full_name ?? 'User',
          likeCount: 0,
          dislikeCount: 0,
          replies: [],
          myReaction: null,
        },
      });
    } catch (e) {
      if (e.code === '23505') {
        throw new HttpError(409, 'DUPLICATE_REVIEW', 'You have already reviewed this technician');
      }
      throw e;
    }
  } catch (e) {
    next(e);
  }
});

// ─── PUT /reviews/technician/:id ─────────────────────────────────────────────
router.put('/reviews/technician/:id', requireAuth, async (req, res, next) => {
  try {
    const body = updateReviewSchema.parse(req.body);
    const pool = getPool();

    const { rows } = await pool.query('SELECT * FROM technician_reviews WHERE id = $1', [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Review not found');
    if (rows[0].buyer_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Not your review');
    }

    const fields = [];
    const vals = [];
    let i = 1;
    if (body.rating !== undefined) {
      fields.push(`rating = $${i++}`);
      vals.push(body.rating);
    }
    if (body.comment !== undefined) {
      fields.push(`comment = $${i++}`);
      vals.push(body.comment);
    }
    if (!fields.length) throw new HttpError(400, 'EMPTY_UPDATE', 'Nothing to update');

    vals.push(req.params.id);
    const { rows: updated } = await pool.query(
      `UPDATE technician_reviews SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    res.json({ data: keysToCamel(updated[0]) });
  } catch (e) {
    next(e);
  }
});

// ─── DELETE /reviews/technician/:id ──────────────────────────────────────────
router.delete('/reviews/technician/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM technician_reviews WHERE id = $1', [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Review not found');

    if (rows[0].buyer_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Not your review');
    }

    await pool.query('DELETE FROM technician_reviews WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// ─── POST /reviews/technician/:id/reply ──────────────────────────────────────
router.post('/reviews/technician/:id/reply', requireAuth, async (req, res, next) => {
  try {
    const body = replySchema.parse(req.body);
    const pool = getPool();

    const { rows: reviewRows } = await pool.query('SELECT * FROM technician_reviews WHERE id = $1', [
      req.params.id,
    ]);
    if (!reviewRows.length) throw new HttpError(404, 'NOT_FOUND', 'Review not found');

    const { rows: techRows } = await pool.query('SELECT user_id FROM technicians WHERE id = $1', [
      reviewRows[0].technician_id,
    ]);
    if (!techRows.length || techRows[0].user_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the technician can reply');
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO technician_review_replies (review_id, user_id, comment)
         VALUES ($1, $2, $3) RETURNING *`,
        [req.params.id, req.user.id, body.comment],
      );

      const { rows: userRow } = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);

      res.status(201).json({
        data: {
          ...keysToCamel(rows[0]),
          authorName: userRow[0]?.full_name ?? 'Technician',
        },
      });
    } catch (e) {
      if (e.code === '23505') {
        throw new HttpError(409, 'DUPLICATE_REPLY', 'You have already replied to this review');
      }
      throw e;
    }
  } catch (e) {
    next(e);
  }
});

// ─── PUT /technician-review-replies/:id ──────────────────────────────────────
router.put('/technician-review-replies/:id', requireAuth, async (req, res, next) => {
  try {
    const body = replySchema.parse(req.body);
    const pool = getPool();

    const { rows } = await pool.query('SELECT * FROM technician_review_replies WHERE id = $1', [
      req.params.id,
    ]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Reply not found');
    if (rows[0].user_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Not your reply');
    }

    const { rows: updated } = await pool.query(
      `UPDATE technician_review_replies SET comment = $1 WHERE id = $2 RETURNING *`,
      [body.comment, req.params.id],
    );
    res.json({ data: keysToCamel(updated[0]) });
  } catch (e) {
    next(e);
  }
});

// ─── DELETE /technician-review-replies/:id ───────────────────────────────────
router.delete('/technician-review-replies/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM technician_review_replies WHERE id = $1', [
      req.params.id,
    ]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Reply not found');

    if (rows[0].user_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Not your reply');
    }

    await pool.query('DELETE FROM technician_review_replies WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// ─── POST /reviews/technician/:id/react ──────────────────────────────────────
router.post('/reviews/technician/:id/react', requireAuth, async (req, res, next) => {
  try {
    const body = reactSchema.parse(req.body);
    const pool = getPool();

    const { rows: reviewCheck } = await pool.query('SELECT id FROM technician_reviews WHERE id = $1', [
      req.params.id,
    ]);
    if (!reviewCheck.length) throw new HttpError(404, 'NOT_FOUND', 'Review not found');

    const { rows: existing } = await pool.query(
      'SELECT * FROM technician_review_reactions WHERE review_id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
    );

    if (existing.length) {
      if (existing[0].reaction === body.reaction) {
        await pool.query('DELETE FROM technician_review_reactions WHERE id = $1', [existing[0].id]);
        return res.json({ data: { reaction: null } });
      }
      await pool.query(
        'UPDATE technician_review_reactions SET reaction = $1 WHERE id = $2',
        [body.reaction, existing[0].id],
      );
      return res.json({ data: { reaction: body.reaction } });
    }

    await pool.query(
      'INSERT INTO technician_review_reactions (review_id, user_id, reaction) VALUES ($1, $2, $3)',
      [req.params.id, req.user.id, body.reaction],
    );
    res.status(201).json({ data: { reaction: body.reaction } });
  } catch (e) {
    next(e);
  }
});

export default router;
