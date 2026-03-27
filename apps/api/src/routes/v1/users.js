import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { requireAuth } from '../../middleware/auth.js';
import { normalizePhone } from '../../lib/phone.js';

const router = Router();

const updateMeSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(8).max(20).optional(),
});

const vehicleSchema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

router.use(requireAuth);

router.put('/me', async (req, res, next) => {
  try {
    const body = updateMeSchema.parse(req.body);
    const pool = getPool();
    const fields = [];
    const vals = [];
    let i = 1;
    if (body.fullName !== undefined) {
      fields.push(`full_name = $${i++}`);
      vals.push(body.fullName);
    }
    if (body.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${i++}`);
      vals.push(body.avatarUrl);
    }
    if (body.email !== undefined) {
      fields.push(`email = $${i++}`);
      vals.push(body.email);
    }
    if (body.phone !== undefined) {
      fields.push(`phone = $${i++}`);
      vals.push(normalizePhone(body.phone));
    }
    if (!fields.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No fields to update');
    vals.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.post('/me/vehicles', async (req, res, next) => {
  try {
    const body = vehicleSchema.parse(req.body);
    const pool = getPool();
    if (body.isPrimary) {
      await pool.query(`UPDATE vehicles SET is_primary = false WHERE user_id = $1`, [req.user.id]);
    }
    const { rows } = await pool.query(
      `INSERT INTO vehicles (user_id, make, model, year, vin, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        req.user.id,
        body.make,
        body.model,
        body.year,
        body.vin ?? null,
        body.isPrimary ?? false,
      ]
    );
    res.status(201).json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/me/vehicles', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM vehicles WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows.map(keysToCamel) });
  } catch (e) {
    next(e);
  }
});

router.delete('/me/vehicles/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const r = await pool.query(
      `DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!r.rowCount) throw new HttpError(404, 'NOT_FOUND', 'Vehicle not found');
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
