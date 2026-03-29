import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import XLSX from 'xlsx';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { parsePagination } from '../../lib/pagination.js';
import { resolveSelfRegistrationAction } from '../../lib/dealerOnboarding.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { normalizePhone } from '../../lib/phone.js';
import { loadDealerProfile } from '../../middleware/dealer.js';
import { formatOrderForViewer } from '../../lib/orderFormat.js';
import { runAutoCancelPendingOrders } from '../../orders/autoCancel.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

const registerSchema = z.object({
  shopName: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  phoneBusiness: z.string().min(8).max(20),
  locationText: z.string().min(1),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  operatingHours: z.record(z.string(), z.string()).optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  openOnHolidays: z.coerce.boolean().optional().default(false),
});

const updateDealerSchema = registerSchema.partial();
const onboardingStatusSchema = z.enum(['pending', 'approved', 'rejected']);
const adminOnboardSchema = registerSchema.extend({
  userId: z.string().uuid().optional(),
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().nullable(),
  onboardingStatus: onboardingStatusSchema.optional().default('approved'),
  onboardingNote: z.string().max(1000).optional().nullable(),
});
const adminOnboardingUpdateSchema = z.object({
  onboardingStatus: onboardingStatusSchema,
  onboardingNote: z.string().max(1000).optional().nullable(),
});

router.post('/register', requireAuth, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(`SELECT * FROM dealers WHERE user_id = $1`, [req.user.id]);
      let row;
      let statusCode = 201;

      if (!existing.rows.length) {
        const action = resolveSelfRegistrationAction(null);
        if (action !== 'create_pending') {
          throw new HttpError(500, 'INTERNAL_ERROR', 'Unexpected onboarding action');
        }
        const created = await client.query(
          `INSERT INTO dealers (
             user_id, shop_name, description, phone_business, location_text, lat, lng,
             operating_hours, banner_url, open_on_holidays, onboarding_status
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
           RETURNING *`,
          [
            req.user.id,
            body.shopName,
            body.description ?? null,
            body.phoneBusiness,
            body.locationText,
            body.lat ?? null,
            body.lng ?? null,
            body.operatingHours ?? null,
            body.bannerUrl ?? null,
            body.openOnHolidays ?? false,
          ],
        );
        row = created.rows[0];
      } else {
        const dealer = existing.rows[0];
        const action = resolveSelfRegistrationAction(dealer.onboarding_status);
        if (action === 'already_approved') {
          throw new HttpError(409, 'DUPLICATE_DEALER', 'Dealer profile already approved');
        }
        if (action !== 'resubmit_pending') {
          throw new HttpError(500, 'INTERNAL_ERROR', 'Unexpected onboarding action');
        }
        const updated = await client.query(
          `UPDATE dealers
           SET shop_name = $1,
               description = $2,
               phone_business = $3,
               location_text = $4,
               lat = $5,
               lng = $6,
               operating_hours = $7,
               banner_url = $8,
               open_on_holidays = $9,
               onboarding_status = 'pending',
               onboarding_note = null,
               updated_at = now()
           WHERE id = $10
           RETURNING *`,
          [
            body.shopName,
            body.description ?? null,
            body.phoneBusiness,
            body.locationText,
            body.lat ?? null,
            body.lng ?? null,
            body.operatingHours ?? null,
            body.bannerUrl ?? null,
            body.openOnHolidays ?? false,
            dealer.id,
          ],
        );
        row = updated.rows[0];
        statusCode = 200;
      }

      // Publishing remains blocked until admin approval.
      await client.query(`UPDATE users SET role = 'buyer' WHERE id = $1`, [req.user.id]);
      await client.query('COMMIT');
      res.status(statusCode).json({ data: keysToCamel(row) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.get('/register/status', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM dealers WHERE user_id = $1`, [req.user.id]);
    if (!rows.length) {
      return res.json({ data: null });
    }
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/me/orders', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    await runAutoCancelPendingOrders();
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const pool = getPool();
    const c = await pool.query(`SELECT COUNT(*)::int AS c FROM orders WHERE dealer_id = $1`, [
      req.dealer.id,
    ]);
    const { rows } = await pool.query(
      `SELECT o.* FROM orders o WHERE o.dealer_id = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`,
      [req.dealer.id, pageSize, offset]
    );
    const out = [];
    for (const o of rows) {
      const br = await pool.query(`SELECT phone, full_name FROM users WHERE id = $1`, [o.buyer_id]);
      out.push(
        formatOrderForViewer(o, {
          role: 'dealer',
          buyerRow: br.rows[0],
        })
      );
    }
    res.json({
      data: out,
      meta: { page, pageSize, total: c.rows[0].c },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me/dashboard', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    const pool = getPool();
    const d = req.dealer;
    const userId = req.user.id;

    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled','completed'))::int AS open_orders,
         COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::numeric AS revenue_paid,
         (SELECT COALESCE(SUM(views_count),0)::bigint FROM parts WHERE dealer_id = $1) AS part_views,
         (SELECT COUNT(*)::int FROM reviews WHERE dealer_id = $1) AS review_count,
         (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM reviews WHERE dealer_id = $1) AS avg_rating,
         (SELECT COALESCE(SUM(cnt), 0)::int FROM (
           SELECT COUNT(*) AS cnt
           FROM messages m
           JOIN conversations c ON c.id = m.conversation_id
           WHERE c.dealer_id = $1
             AND m.sender_id != $2
             AND m.is_read = false
         ) sub) AS unread_messages
       FROM orders WHERE dealer_id = $1`,
      [d.id, userId]
    );
    res.json({ data: keysToCamel({ ...stats.rows[0], dealerId: d.id }) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, loadDealerProfile, (req, res) => {
  res.json({ data: keysToCamel(req.dealer) });
});

router.put('/me', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    const body = updateDealerSchema.parse(req.body);
    const pool = getPool();
    const fields = [];
    const vals = [];
    let i = 1;
    const map = [
      ['shopName', 'shop_name'],
      ['description', 'description'],
      ['phoneBusiness', 'phone_business'],
      ['locationText', 'location_text'],
      ['lat', 'lat'],
      ['lng', 'lng'],
      ['operatingHours', 'operating_hours'],
      ['bannerUrl', 'banner_url'],
      ['openOnHolidays', 'open_on_holidays'],
    ];
    for (const [k, col] of map) {
      if (body[k] !== undefined) {
        fields.push(`${col} = $${i++}`);
        vals.push(body[k]);
      }
    }
    if (!fields.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No fields to update');
    vals.push(req.dealer.id);
    const { rows } = await pool.query(
      `UPDATE dealers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/overview', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total_dealers,
         COUNT(*) FILTER (WHERE onboarding_status = 'pending')::int AS pending_onboarding,
         COUNT(*) FILTER (WHERE onboarding_status = 'approved')::int AS approved_onboarding,
         COUNT(*) FILTER (WHERE onboarding_status = 'rejected')::int AS rejected_onboarding,
         COUNT(*) FILTER (WHERE is_verified = true)::int AS verified_dealers
       FROM dealers`
    );
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/list', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const q = req.query.q ? String(req.query.q).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';
    const where = [];
    const vals = [];
    let i = 1;
    if (q) {
      where.push(`(d.shop_name ILIKE $${i} OR u.full_name ILIKE $${i} OR COALESCE(u.phone,'') ILIKE $${i})`);
      vals.push(`%${q}%`);
      i++;
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.push(`d.onboarding_status = $${i++}`);
      vals.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pool = getPool();
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM dealers d
       JOIN users u ON u.id = d.user_id
       ${whereSql}`,
      vals
    );
    vals.push(pageSize, offset);
    const { rows } = await pool.query(
      `SELECT d.*, u.full_name AS user_full_name, u.phone AS user_phone, u.email AS user_email
       FROM dealers d
       JOIN users u ON u.id = d.user_id
       ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      vals
    );
    res.json({ data: rows.map(keysToCamel), meta: { page, pageSize, total: countR.rows[0].c } });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    const where = [];
    const vals = [];
    if (q) {
      where.push(`(u.full_name ILIKE $1 OR COALESCE(u.phone,'') ILIKE $1 OR COALESCE(u.email,'') ILIKE $1)`);
      vals.push(`%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.email, u.role, d.id AS dealer_id
       FROM users u
       LEFT JOIN dealers d ON d.user_id = u.id
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT 25`,
      vals
    );
    res.json({ data: rows.map(keysToCamel) });
  } catch (e) {
    next(e);
  }
});

router.post('/admin/onboard', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = adminOnboardSchema.parse(req.body);
    const pool = getPool();

    let userId = body.userId;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!userId) {
        if (!body.fullName || !body.phone) {
          throw new HttpError(400, 'MISSING_USER_FIELDS', 'fullName and phone are required when creating a new dealer');
        }
        const phone = normalizePhone(body.phone);
        const dup = await client.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
        if (dup.rows.length) {
          throw new HttpError(409, 'PHONE_EXISTS', 'A user with this phone number already exists');
        }
        const newUser = await client.query(
          `INSERT INTO users (full_name, phone, email, role)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [body.fullName, phone, body.email ?? null, body.onboardingStatus === 'approved' ? 'dealer' : 'buyer']
        );
        userId = newUser.rows[0].id;
      } else {
        const userR = await client.query(`SELECT id FROM users WHERE id = $1`, [userId]);
        if (!userR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'User not found');
        const role = body.onboardingStatus === 'approved' ? 'dealer' : 'buyer';
        await client.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, userId]);
      }

      const existing = await client.query(`SELECT id FROM dealers WHERE user_id = $1`, [userId]);
      if (existing.rows.length) throw new HttpError(409, 'ALREADY_REGISTERED', 'Dealer profile already exists for this user');

      const { rows } = await client.query(
        `INSERT INTO dealers (
           user_id, shop_name, description, phone_business, location_text, lat, lng,
           operating_hours, banner_url, open_on_holidays,
           onboarding_status, onboarding_note, onboarded_by_user_id, onboarded_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()) RETURNING *`,
        [
          userId,
          body.shopName,
          body.description ?? null,
          body.phoneBusiness,
          body.locationText,
          body.lat ?? null,
          body.lng ?? null,
          body.operatingHours ?? null,
          body.bannerUrl ?? null,
          body.openOnHolidays ?? false,
          body.onboardingStatus,
          body.onboardingNote ?? null,
          req.user.id,
        ]
      );
      await client.query('COMMIT');
      res.status(201).json({ data: keysToCamel(rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

const TEMPLATE_COLUMNS = [
  { header: 'fullName', width: 25 },
  { header: 'phone', width: 20 },
  { header: 'email', width: 25 },
  { header: 'shopName', width: 25 },
  { header: 'phoneBusiness', width: 20 },
  { header: 'locationText', width: 30 },
  { header: 'description', width: 35 },
];

const TEMPLATE_EXAMPLE = {
  fullName: 'Kwame Asante',
  phone: '+233200000001',
  email: 'kwame@example.com',
  shopName: 'Kwame Auto Parts',
  phoneBusiness: '+233200000002',
  locationText: 'Abossey Okai, Accra',
  description: 'Specializes in Toyota parts',
};

router.get('/admin/onboard-template', requireAuth, requireRole('admin'), (_req, res, next) => {
  try {
    const wb = XLSX.utils.book_new();
    const rows = [TEMPLATE_EXAMPLE];
    const ws = XLSX.utils.json_to_sheet(rows, { header: TEMPLATE_COLUMNS.map((c) => c.header) });
    ws['!cols'] = TEMPLATE_COLUMNS.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(wb, ws, 'Dealers');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dealer-onboarding-template.xlsx"');
    res.send(buf);
  } catch (e) {
    next(e);
  }
});

const REQUIRED_BULK_FIELDS = ['fullName', 'phone', 'shopName', 'phoneBusiness', 'locationText'];

router.post('/admin/onboard-bulk', requireAuth, requireRole('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'NO_FILE', 'No file uploaded');

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new HttpError(400, 'EMPTY_FILE', 'The uploaded file has no sheets');

    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows.length) throw new HttpError(400, 'EMPTY_FILE', 'The uploaded file has no data rows');

    const pool = getPool();
    const client = await pool.connect();
    const errors = [];
    let created = 0;

    try {
      await client.query('BEGIN');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const fullName = String(row.fullName || '').trim();
        const phone = String(row.phone || '').trim();
        const email = String(row.email || '').trim() || null;
        const shopName = String(row.shopName || '').trim();
        const phoneBusiness = String(row.phoneBusiness || '').trim();
        const locationText = String(row.locationText || '').trim();
        const description = String(row.description || '').trim() || null;

        const missing = REQUIRED_BULK_FIELDS.filter((f) => !String(row[f] || '').trim());
        if (missing.length) {
          errors.push({ row: rowNum, phone: phone || '—', reason: `Missing required fields: ${missing.join(', ')}` });
          continue;
        }

        try {
          const dup = await client.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
          if (dup.rows.length) {
            errors.push({ row: rowNum, phone, reason: 'Phone number already exists' });
            continue;
          }

          const newUser = await client.query(
            `INSERT INTO users (full_name, phone, email, role) VALUES ($1, $2, $3, 'dealer') RETURNING id`,
            [fullName, phone, email],
          );
          const userId = newUser.rows[0].id;

          await client.query(
            `INSERT INTO dealers (
               user_id, shop_name, description, phone_business, location_text,
               onboarding_status, onboarding_note, onboarded_by_user_id, onboarded_at
             ) VALUES ($1,$2,$3,$4,$5,'approved',null,$6,now())`,
            [userId, shopName, description, phoneBusiness, locationText, req.user.id],
          );

          created++;
        } catch (rowErr) {
          errors.push({ row: rowNum, phone, reason: rowErr.message || 'Unexpected error' });
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({
      data: {
        total: rows.length,
        created,
        failed: errors.length,
        errors,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/admin/:id/onboarding', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = adminOnboardingUpdateSchema.parse(req.body);
    const pool = getPool();
    const dealerR = await pool.query(`SELECT * FROM dealers WHERE id = $1`, [req.params.id]);
    if (!dealerR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    const dealer = dealerR.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE dealers
         SET onboarding_status = $1, onboarding_note = $2, onboarded_by_user_id = $3, onboarded_at = now()
         WHERE id = $4`,
        [body.onboardingStatus, body.onboardingNote ?? null, req.user.id, req.params.id]
      );
      const newRole = body.onboardingStatus === 'approved' ? 'dealer' : 'buyer';
      await client.query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, dealer.user_id]);
      const { rows } = await client.query(`SELECT * FROM dealers WHERE id = $1`, [req.params.id]);
      await client.query('COMMIT');
      res.json({ data: keysToCamel(rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

const adminEditDealerSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().nullable(),
  shopName: z.string().min(1).max(255).optional(),
  phoneBusiness: z.string().min(8).max(20).optional(),
  locationText: z.string().min(1).optional(),
  description: z.string().max(5000).optional().nullable(),
  onboardingStatus: onboardingStatusSchema.optional(),
});

router.put('/admin/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = adminEditDealerSchema.parse(req.body);
    const pool = getPool();

    const dealerR = await pool.query(
      `SELECT d.*, u.full_name AS user_full_name, u.phone AS user_phone, u.email AS user_email
       FROM dealers d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
      [req.params.id],
    );
    if (!dealerR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    const dealer = dealerR.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userFields = [];
      const userVals = [];
      let ui = 1;
      if (body.fullName !== undefined) { userFields.push(`full_name = $${ui++}`); userVals.push(body.fullName); }
      if (body.phone !== undefined) {
        const phone = normalizePhone(body.phone);
        const dup = await client.query(`SELECT id FROM users WHERE phone = $1 AND id != $2`, [phone, dealer.user_id]);
        if (dup.rows.length) throw new HttpError(409, 'PHONE_EXISTS', 'A user with this phone number already exists');
        userFields.push(`phone = $${ui++}`);
        userVals.push(phone);
      }
      if (body.email !== undefined) { userFields.push(`email = $${ui++}`); userVals.push(body.email); }
      if (userFields.length) {
        userVals.push(dealer.user_id);
        await client.query(`UPDATE users SET ${userFields.join(', ')} WHERE id = $${ui}`, userVals);
      }

      const dealerFields = [];
      const dealerVals = [];
      let di = 1;
      if (body.shopName !== undefined) { dealerFields.push(`shop_name = $${di++}`); dealerVals.push(body.shopName); }
      if (body.phoneBusiness !== undefined) { dealerFields.push(`phone_business = $${di++}`); dealerVals.push(body.phoneBusiness); }
      if (body.locationText !== undefined) { dealerFields.push(`location_text = $${di++}`); dealerVals.push(body.locationText); }
      if (body.description !== undefined) { dealerFields.push(`description = $${di++}`); dealerVals.push(body.description); }
      if (body.onboardingStatus !== undefined) {
        dealerFields.push(`onboarding_status = $${di++}`);
        dealerVals.push(body.onboardingStatus);
        const newRole = body.onboardingStatus === 'approved' ? 'dealer' : 'buyer';
        await client.query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, dealer.user_id]);
      }
      if (dealerFields.length) {
        dealerVals.push(req.params.id);
        await client.query(`UPDATE dealers SET ${dealerFields.join(', ')} WHERE id = $${di}`, dealerVals);
      }

      const { rows } = await client.query(
        `SELECT d.*, u.full_name AS user_full_name, u.phone AS user_phone, u.email AS user_email
         FROM dealers d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
        [req.params.id],
      );
      await client.query('COMMIT');
      res.json({ data: keysToCamel(rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const dealerR = await pool.query(`SELECT * FROM dealers WHERE id = $1`, [req.params.id]);
    if (!dealerR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    const dealer = dealerR.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM dealers WHERE id = $1`, [req.params.id]);
      await client.query(`UPDATE users SET role = 'buyer' WHERE id = $1`, [dealer.user_id]);
      await client.query('COMMIT');
      res.json({ data: { deleted: true } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/verify', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE dealers SET is_verified = NOT is_verified, verified_at = CASE WHEN NOT is_verified THEN now() ELSE verified_at END WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const pool = getPool();
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM dealers WHERE onboarding_status = 'approved'`
    );
    const total = countR.rows[0].c;
    const { rows } = await pool.query(
      `SELECT * FROM dealers WHERE onboarding_status = 'approved'
       ORDER BY is_verified DESC, rating_avg DESC NULLS LAST, created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    res.json({
      data: rows.map(keysToCamel),
      meta: { page, pageSize, total },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows: dealers } = await pool.query(`SELECT * FROM dealers WHERE id = $1`, [
      req.params.id,
    ]);
    if (!dealers.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
    const dealer = dealers[0];
    const partsR = await pool.query(
      `SELECT * FROM parts WHERE dealer_id = $1 AND is_available = true
       ORDER BY created_at DESC LIMIT 24`,
      [dealer.id]
    );
    const revR = await pool.query(
      `SELECT r.*, u.full_name AS buyer_full_name
       FROM reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.dealer_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [dealer.id]
    );
    res.json({
      data: {
        dealer: keysToCamel(dealer),
        parts: partsR.rows.map(keysToCamel),
        reviews: revR.rows.map(keysToCamel),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
