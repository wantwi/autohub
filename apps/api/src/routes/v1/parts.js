import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { parsePagination } from '../../lib/pagination.js';
import { PART_CATEGORIES } from '../../lib/partCategories.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { loadDealerProfile, requireApprovedDealer } from '../../middleware/dealer.js';

const dealerPartsRouter = Router();
const adminPartsRouter = Router();

const categorySchema = z
  .string()
  .min(1)
  .refine((s) => PART_CATEGORIES.includes(s), { message: 'Invalid category' });

const partBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(10000).optional().nullable(),
  category: categorySchema,
  condition: z.enum(['new', 'used', 'refurbished']),
  price: z.coerce.number().positive(),
  quantity: z.coerce.number().int().min(0).default(1),
  compatibleMakes: z.array(z.string()).optional().default([]),
  compatibleModels: z.array(z.string()).optional().default([]),
  minCompatibleYear: z.coerce.number().int().optional().nullable(),
  maxCompatibleYear: z.coerce.number().int().optional().nullable(),
  images: z.array(z.string().url()).max(5).optional().default([]),
  partNumber: z.string().max(100).optional().nullable(),
});

function buildYearRange(minY, maxY) {
  if (minY == null && maxY == null) return null;
  const lo = minY ?? 1900;
  const hi = (maxY ?? new Date().getFullYear()) + 1;
  return `[${lo},${hi})`;
}

async function createPartForDealer({ pool, dealerId, body, createdByUserId, createdByRole }) {
  const range = buildYearRange(body.minCompatibleYear, body.maxCompatibleYear);
  const base = [
    dealerId,
    body.name,
    body.description ?? null,
    body.category,
    body.condition,
    body.price,
    body.quantity,
    body.compatibleMakes,
    body.compatibleModels,
    body.images,
    body.partNumber ?? null,
    createdByUserId ?? null,
    createdByRole ?? null,
  ];
  const sql = range
    ? `INSERT INTO parts (
         dealer_id, name, description, category, condition, price, quantity,
         compatible_makes, compatible_models, compatible_years, images, part_number,
         created_by_user_id, created_by_role
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::int4range,$11,$12,$13,$14) RETURNING *`
    : `INSERT INTO parts (
         dealer_id, name, description, category, condition, price, quantity,
         compatible_makes, compatible_models, images, part_number, created_by_user_id, created_by_role
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`;
  const params = range ? [...base.slice(0, 9), range, ...base.slice(9)] : base;
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

dealerPartsRouter.get('/me/parts', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM parts WHERE dealer_id = $1 ORDER BY created_at DESC NULLS LAST, id DESC`,
      [req.dealer.id]
    );
    res.json({ data: rows.map(keysToCamel) });
  } catch (e) {
    next(e);
  }
});

dealerPartsRouter.post('/me/parts', requireAuth, loadDealerProfile, requireApprovedDealer, async (req, res, next) => {
  try {
    const body = partBodySchema.parse(req.body);
    const pool = getPool();
    const row = await createPartForDealer({
      pool,
      dealerId: req.dealer.id,
      body,
      createdByUserId: req.user.id,
      createdByRole: req.user.role,
    });
    res.status(201).json({ data: keysToCamel(row) });
  } catch (e) {
    next(e);
  }
});

adminPartsRouter.get('/dealers/:dealerId/parts', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const dealerR = await pool.query(`SELECT id, shop_name FROM dealers WHERE id = $1`, [req.params.dealerId]);
    if (!dealerR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    const { rows } = await pool.query(
      `SELECT * FROM parts WHERE dealer_id = $1 ORDER BY created_at DESC NULLS LAST, id DESC`,
      [req.params.dealerId]
    );
    res.json({ data: rows.map(keysToCamel) });
  } catch (e) {
    next(e);
  }
});

adminPartsRouter.post('/dealers/:dealerId/parts', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = partBodySchema.parse(req.body);
    const pool = getPool();
    const dealerR = await pool.query(`SELECT id FROM dealers WHERE id = $1`, [req.params.dealerId]);
    if (!dealerR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    const row = await createPartForDealer({
      pool,
      dealerId: req.params.dealerId,
      body,
      createdByUserId: req.user.id,
      createdByRole: req.user.role,
    });
    res.status(201).json({ data: keysToCamel(row) });
  } catch (e) {
    next(e);
  }
});

dealerPartsRouter.put('/me/parts/:id', requireAuth, loadDealerProfile, requireApprovedDealer, async (req, res, next) => {
  try {
    const body = partBodySchema.partial().parse(req.body);
    const pool = getPool();
    const own = await pool.query(`SELECT id FROM parts WHERE id = $1 AND dealer_id = $2`, [
      req.params.id,
      req.dealer.id,
    ]);
    if (!own.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Part not found');

    const range =
      body.minCompatibleYear !== undefined || body.maxCompatibleYear !== undefined
        ? buildYearRange(
            body.minCompatibleYear ?? undefined,
            body.maxCompatibleYear ?? undefined
          )
        : undefined;

    const fields = [];
    const vals = [];
    let i = 1;
    const push = (col, val) => {
      fields.push(`${col} = $${i++}`);
      vals.push(val);
    };
    if (body.name !== undefined) push('name', body.name);
    if (body.description !== undefined) push('description', body.description);
    if (body.category !== undefined) push('category', body.category);
    if (body.condition !== undefined) push('condition', body.condition);
    if (body.price !== undefined) push('price', body.price);
    if (body.quantity !== undefined) push('quantity', body.quantity);
    if (body.compatibleMakes !== undefined) push('compatible_makes', body.compatibleMakes);
    if (body.compatibleModels !== undefined) push('compatible_models', body.compatibleModels);
    if (range !== undefined) {
      fields.push(`compatible_years = $${i++}::int4range`);
      vals.push(range || null);
    }
    if (body.images !== undefined) push('images', body.images);
    if (body.partNumber !== undefined) push('part_number', body.partNumber);
    if (!fields.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No fields to update');
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE parts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

dealerPartsRouter.delete('/me/parts/:id', requireAuth, loadDealerProfile, requireApprovedDealer, async (req, res, next) => {
  try {
    const pool = getPool();
    const r = await pool.query(`DELETE FROM parts WHERE id = $1 AND dealer_id = $2 RETURNING id`, [
      req.params.id,
      req.dealer.id,
    ]);
    if (!r.rowCount) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

dealerPartsRouter.patch('/me/parts/:id/toggle', requireAuth, loadDealerProfile, requireApprovedDealer, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE parts SET is_available = NOT is_available
       WHERE id = $1 AND dealer_id = $2 RETURNING *`,
      [req.params.id, req.dealer.id]
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

const publicRouter = Router();

publicRouter.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const q = req.query.q ? String(req.query.q).trim() : '';
    const make = req.query.make ? String(req.query.make).trim() : '';
    const model = req.query.model ? String(req.query.model).trim() : '';
    const year = req.query.year ? Number(req.query.year) : null;
    const category = req.query.category ? String(req.query.category).trim() : '';
    const condition = req.query.condition ? String(req.query.condition).trim() : '';
    const sort = req.query.sort ? String(req.query.sort) : 'newest';

    const where = [`p.is_available = true`, `d.is_verified = true`];
    const params = [];
    let pi = 1;
    if (q) {
      where.push(`(p.name ILIKE $${pi} OR p.description ILIKE $${pi})`);
      params.push(`%${q}%`);
      pi++;
    }
    if (category) {
      where.push(`p.category = $${pi++}`);
      params.push(category);
    }
    if (condition) {
      where.push(`p.condition = $${pi++}`);
      params.push(condition);
    }
    if (make) {
      where.push(
        `(cardinality(p.compatible_makes) = 0 OR EXISTS (SELECT 1 FROM unnest(p.compatible_makes) m WHERE lower(m) = lower($${pi})))`
      );
      params.push(make);
      pi++;
    }
    if (model) {
      where.push(
        `(cardinality(p.compatible_models) = 0 OR EXISTS (SELECT 1 FROM unnest(p.compatible_models) m WHERE lower(m) = lower($${pi})))`
      );
      params.push(model);
      pi++;
    }
    if (year && Number.isFinite(year)) {
      where.push(`(p.compatible_years IS NULL OR p.compatible_years @> $${pi}::int)`);
      params.push(year);
      pi++;
    }

    const whereSql = where.join(' AND ');
    let orderSql = 'p.created_at DESC';
    if (sort === 'price_asc') orderSql = 'p.price ASC';
    if (sort === 'price_desc') orderSql = 'p.price DESC';
    if (sort === 'rating_desc') orderSql = 'd.rating_avg DESC NULLS LAST';

    const pool = getPool();
    const countQ = await pool.query(
      `SELECT COUNT(*)::int AS c FROM parts p JOIN dealers d ON d.id = p.dealer_id WHERE ${whereSql}`,
      params
    );
    const total = countQ.rows[0].c;
    params.push(pageSize, offset);
    const list = await pool.query(
      `SELECT p.*, d.shop_name AS dealer_shop_name, d.is_verified AS dealer_is_verified,
              d.rating_avg AS dealer_rating_avg, d.location_text AS dealer_location_text, d.id AS dealer_id
       FROM parts p
       JOIN dealers d ON d.id = p.dealer_id
       WHERE ${whereSql}
       ORDER BY ${orderSql}
       LIMIT $${pi++} OFFSET $${pi++}`,
      params
    );
    res.json({
      data: list.rows.map(keysToCamel),
      meta: { page, pageSize, total },
    });
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/categories', (req, res) => {
  res.json({ data: PART_CATEGORIES });
});

publicRouter.get('/:id/compare', async (req, res, next) => {
  try {
    const pool = getPool();
    const baseR = await pool.query(`SELECT * FROM parts WHERE id = $1`, [req.params.id]);
    if (!baseR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
    const b = baseR.rows[0];

    const nameWords = String(b.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let pi = 1;
    const params = [b.id];
    pi++;
    params.push(b.category);
    const catIdx = pi++;

    const signals = [];

    if (nameWords.length) {
      const wordClauses = nameWords.map((w) => {
        params.push(`%${w}%`);
        return `lower(p.name) LIKE $${pi++}`;
      });
      signals.push(`(${wordClauses.join(' AND ')})`);
    }

    if (b.part_number) {
      params.push(b.part_number);
      signals.push(`(p.part_number IS NOT NULL AND p.part_number = $${pi++})`);
    }

    if (b.compatible_makes && b.compatible_makes.length) {
      params.push(b.compatible_makes);
      signals.push(`(p.compatible_makes && $${pi++})`);
    }

    const signalSql = signals.length ? `AND (${signals.join(' OR ')})` : '';

    const { rows } = await pool.query(
      `SELECT p.*, d.shop_name AS dealer_shop_name, d.is_verified AS dealer_is_verified,
              d.rating_avg AS dealer_rating_avg, d.location_text AS dealer_location_text, d.id AS dealer_id
       FROM parts p
       JOIN dealers d ON d.id = p.dealer_id
       WHERE p.id <> $1
         AND p.is_available = true
         AND d.is_verified = true
         AND p.category = $${catIdx}
         ${signalSql}
       ORDER BY p.price ASC
       LIMIT 20`,
      params,
    );
    res.json({
      data: rows.map(keysToCamel),
      meta: {
        compareRule:
          'Same category required, plus matching name keywords (AND), part number, or overlapping compatible makes.',
      },
    });
  } catch (e) {
    next(e);
  }
});

publicRouter.get('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT p.*, d.shop_name AS dealer_shop_name, d.is_verified AS dealer_is_verified,
              d.rating_avg AS dealer_rating_avg, d.rating_count AS dealer_rating_count,
              d.location_text AS dealer_location_text, d.lat AS dealer_lat, d.lng AS dealer_lng,
              d.phone_business AS dealer_phone_business, d.id AS dealer_id
       FROM parts p
       JOIN dealers d ON d.id = p.dealer_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
    await pool.query(`UPDATE parts SET views_count = views_count + 1 WHERE id = $1`, [
      req.params.id,
    ]);
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

export { dealerPartsRouter, adminPartsRouter, publicRouter as partsPublicRouter };
