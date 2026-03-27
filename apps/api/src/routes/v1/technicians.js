import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { parsePagination } from '../../lib/pagination.js';
import { normalizePhone } from '../../lib/phone.js';

const patchTechRequestSchema = z.object({
  status: z.enum(['accepted', 'declined', 'completed']),
  technicianNote: z.string().max(5000).optional().nullable(),
});

const VALID_SPECIALIZATIONS = [
  'mechanic',
  'electrician',
  'body_work',
  'ac_tech',
  'tyre_alignment',
  'diagnostics',
  'towing',
  'glass',
];

const specializationSchema = z.enum([VALID_SPECIALIZATIONS[0], ...VALID_SPECIALIZATIONS.slice(1)]);

const serviceModeSchema = z.enum(['mobile', 'workshop', 'both']);
const onboardingStatusSchema = z.enum(['pending', 'approved', 'rejected']);

const router = Router();

/**
 * Attaches req.technician (row) for the authenticated user.
 */
async function loadTechProfile(req, res, next) {
  try {
    const pool = getPool();
    const r = await pool.query('SELECT * FROM technicians WHERE user_id = $1', [req.user.id]);
    if (!r.rows.length) {
      return next(new HttpError(404, 'NOT_FOUND', 'Technician profile not found'));
    }
    req.technician = r.rows[0];
    next();
  } catch (e) {
    next(e);
  }
}

const updateMeSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  phoneBusiness: z.string().max(30).optional().nullable(),
  specializations: z.array(specializationSchema).optional(),
  description: z.string().max(5000).optional().nullable(),
  locationText: z.string().max(500).optional().nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  serviceMode: serviceModeSchema.optional(),
  operatingHours: z.record(z.string(), z.string()).optional().nullable(),
  openOnHolidays: z.coerce.boolean().optional(),
  bannerUrl: z.string().url().optional().nullable(),
});

const adminOnboardSchema = z.object({
  userId: z.string().uuid().optional(),
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().nullable(),
  displayName: z.string().min(1).max(255),
  phoneBusiness: z.string().max(30).optional().nullable(),
  specializations: z.array(specializationSchema),
  serviceMode: serviceModeSchema.optional(),
  description: z.string().max(5000).optional().nullable(),
  locationText: z.string().max(500).optional().nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  operatingHours: z.record(z.string(), z.string()).optional().nullable(),
  openOnHolidays: z.coerce.boolean().optional().default(false),
  bannerUrl: z.string().url().optional().nullable(),
  onboardingStatus: onboardingStatusSchema.optional().default('approved'),
  onboardingNote: z.string().max(1000).optional().nullable(),
});

const adminOnboardingUpdateSchema = z.object({
  onboardingStatus: onboardingStatusSchema,
  onboardingNote: z.string().max(1000).optional().nullable(),
});

const adminEditTechnicianSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().nullable(),
  displayName: z.string().min(1).max(255).optional(),
  phoneBusiness: z.string().max(30).optional().nullable(),
  specializations: z.array(specializationSchema).optional(),
  description: z.string().max(5000).optional().nullable(),
  locationText: z.string().max(500).optional().nullable(),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  serviceMode: serviceModeSchema.optional(),
  operatingHours: z.record(z.string(), z.string()).optional().nullable(),
  openOnHolidays: z.coerce.boolean().optional(),
  bannerUrl: z.string().url().optional().nullable(),
  onboardingStatus: onboardingStatusSchema.optional(),
});

router.get('/me/dashboard', requireAuth, loadTechProfile, async (req, res, next) => {
  try {
    const pool = getPool();
    const t = req.technician;
    const userId = req.user.id;

    const statsR = await pool.query(
      `SELECT
         t.rating_avg,
         t.rating_count,
         (SELECT COUNT(*)::int FROM service_requests sr WHERE sr.technician_id = t.id AND sr.status = 'pending')   AS pending_service_requests,
         (SELECT COUNT(*)::int FROM service_requests sr WHERE sr.technician_id = t.id AND sr.status = 'accepted')  AS accepted_service_requests,
         (SELECT COUNT(*)::int FROM service_requests sr WHERE sr.technician_id = t.id AND sr.status = 'completed') AS completed_service_requests
       FROM technicians t
       WHERE t.id = $1`,
      [t.id],
    );

    const unreadR = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM conversations cv
       JOIN messages m ON m.conversation_id = cv.id
       WHERE cv.technician_id = $1
         AND m.sender_id != $2
         AND m.is_read = false`,
      [t.id, userId],
    );

    const recentRequestsR = await pool.query(
      `SELECT sr.id, sr.description, sr.status, sr.preferred_date, sr.service_mode, sr.created_at,
              u.full_name AS buyer_name
       FROM service_requests sr
       JOIN users u ON u.id = sr.buyer_id
       WHERE sr.technician_id = $1 AND sr.status = 'pending'
       ORDER BY sr.created_at DESC
       LIMIT 3`,
      [t.id],
    );

    const latestReviewR = await pool.query(
      `SELECT tr.rating, tr.comment, tr.created_at, u.full_name AS buyer_name
       FROM technician_reviews tr
       JOIN users u ON u.id = tr.buyer_id
       WHERE tr.technician_id = $1
       ORDER BY tr.created_at DESC
       LIMIT 1`,
      [t.id],
    );

    res.json({
      data: keysToCamel({
        ...statsR.rows[0],
        technicianId: t.id,
        unreadMessages: unreadR.rows[0]?.c ?? 0,
        recentRequests: recentRequestsR.rows.map((r) => keysToCamel(r)),
        latestReview: latestReviewR.rows[0] ? keysToCamel(latestReviewR.rows[0]) : null,
      }),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, loadTechProfile, (req, res) => {
  res.json({ data: keysToCamel(req.technician) });
});

router.put('/me', requireAuth, loadTechProfile, async (req, res, next) => {
  try {
    const body = updateMeSchema.parse(req.body);
    const pool = getPool();
    const fields = [];
    const vals = [];
    let i = 1;
    const map = [
      ['displayName', 'display_name'],
      ['phoneBusiness', 'phone_business'],
      ['specializations', 'specializations'],
      ['description', 'description'],
      ['locationText', 'location_text'],
      ['lat', 'lat'],
      ['lng', 'lng'],
      ['serviceMode', 'service_mode'],
      ['operatingHours', 'operating_hours'],
      ['openOnHolidays', 'open_on_holidays'],
      ['bannerUrl', 'banner_url'],
    ];
    for (const [k, col] of map) {
      if (body[k] !== undefined) {
        fields.push(`${col} = $${i++}`);
        vals.push(body[k]);
      }
    }
    if (!fields.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No fields to update');
    vals.push(req.technician.id);
    const { rows } = await pool.query(
      `UPDATE technicians SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/me/requests', requireAuth, loadTechProfile, async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const statusFilter = req.query.status ? String(req.query.status).trim() : '';
    const pool = getPool();
    const techId = req.technician.id;

    const allowed = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];
    const where = ['sr.technician_id = $1'];
    const vals = [techId];
    let idx = 2;
    if (statusFilter && allowed.includes(statusFilter)) {
      where.push(`sr.status = $${idx++}`);
      vals.push(statusFilter);
    }
    const whereSql = where.join(' AND ');

    const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM service_requests sr WHERE ${whereSql}`, vals);
    vals.push(pageSize, offset);
    const { rows } = await pool.query(
      `SELECT sr.*, u.full_name AS buyer_name
       FROM service_requests sr
       JOIN users u ON u.id = sr.buyer_id
       WHERE ${whereSql}
       ORDER BY sr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      vals,
    );
    res.json({
      data: rows.map((r) => keysToCamel(r)),
      meta: { page, pageSize, total: countR.rows[0].c },
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/me/requests/:requestId', requireAuth, loadTechProfile, async (req, res, next) => {
  try {
    const requestId = z.string().uuid().parse(req.params.requestId);
    const body = patchTechRequestSchema.parse(req.body);
    const pool = getPool();
    const techId = req.technician.id;

    const { rows } = await pool.query(`SELECT * FROM service_requests WHERE id = $1 AND technician_id = $2`, [
      requestId,
      techId,
    ]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Service request not found');

    const fields = [`status = $1`, `updated_at = now()`];
    const vals = [body.status];
    let i = 2;
    if (body.technicianNote !== undefined) {
      fields.push(`technician_note = $${i++}`);
      vals.push(body.technicianNote);
    }
    vals.push(requestId);
    const { rows: updated } = await pool.query(
      `UPDATE service_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );
    res.json({ data: keysToCamel(updated[0]) });
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
    let idx = 1;
    if (q) {
      where.push(
        `(t.display_name ILIKE $${idx} OR t.location_text ILIKE $${idx} OR u.full_name ILIKE $${idx} OR COALESCE(u.phone,'') ILIKE $${idx})`,
      );
      vals.push(`%${q}%`);
      idx++;
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.push(`t.onboarding_status = $${idx++}`);
      vals.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const pool = getPool();
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c
       FROM technicians t
       JOIN users u ON u.id = t.user_id
       ${whereSql}`,
      vals,
    );
    vals.push(pageSize, offset);
    const { rows } = await pool.query(
      `SELECT t.*, u.full_name AS user_full_name, u.phone AS user_phone, u.email AS user_email
       FROM technicians t
       JOIN users u ON u.id = t.user_id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      vals,
    );
    res.json({ data: rows.map(keysToCamel), meta: { page, pageSize, total: countR.rows[0].c } });
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
          throw new HttpError(
            400,
            'MISSING_USER_FIELDS',
            'fullName and phone are required when creating a new technician user',
          );
        }
        const phone = normalizePhone(body.phone);
        const dup = await client.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
        if (dup.rows.length) {
          throw new HttpError(409, 'PHONE_EXISTS', 'A user with this phone number already exists');
        }
        const newUser = await client.query(
          `INSERT INTO users (full_name, phone, email, role)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [
            body.fullName,
            phone,
            body.email ?? null,
            body.onboardingStatus === 'approved' ? 'technician' : 'buyer',
          ],
        );
        userId = newUser.rows[0].id;
      } else {
        const userR = await client.query(`SELECT id FROM users WHERE id = $1`, [userId]);
        if (!userR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'User not found');
        const role = body.onboardingStatus === 'approved' ? 'technician' : 'buyer';
        await client.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, userId]);
      }

      const existing = await client.query(`SELECT id FROM technicians WHERE user_id = $1`, [userId]);
      if (existing.rows.length) {
        throw new HttpError(409, 'ALREADY_REGISTERED', 'Technician profile already exists for this user');
      }

      const { rows } = await client.query(
        `INSERT INTO technicians (
           user_id, display_name, phone_business, specializations, description, location_text, lat, lng,
           service_mode, operating_hours, open_on_holidays, banner_url,
           onboarding_status, onboarding_note, onboarded_by_user_id, onboarded_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now()) RETURNING *`,
        [
          userId,
          body.displayName,
          body.phoneBusiness ?? null,
          body.specializations,
          body.description ?? null,
          body.locationText ?? null,
          body.lat ?? null,
          body.lng ?? null,
          body.serviceMode ?? 'both',
          body.operatingHours ?? null,
          body.openOnHolidays ?? false,
          body.bannerUrl ?? null,
          body.onboardingStatus,
          body.onboardingNote ?? null,
          req.user.id,
        ],
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

router.patch('/admin/:id/onboarding', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = adminOnboardingUpdateSchema.parse(req.body);
    const pool = getPool();
    const techR = await pool.query(`SELECT * FROM technicians WHERE id = $1`, [req.params.id]);
    if (!techR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    const technician = techR.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE technicians
         SET onboarding_status = $1, onboarding_note = $2, onboarded_by_user_id = $3, onboarded_at = now()
         WHERE id = $4`,
        [body.onboardingStatus, body.onboardingNote ?? null, req.user.id, req.params.id],
      );
      const newRole = body.onboardingStatus === 'approved' ? 'technician' : 'buyer';
      await client.query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, technician.user_id]);
      const { rows } = await client.query(`SELECT * FROM technicians WHERE id = $1`, [req.params.id]);
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

router.put('/admin/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const body = adminEditTechnicianSchema.parse(req.body);
    const pool = getPool();

    const techR = await pool.query(
      `SELECT t.*, u.full_name AS user_full_name, u.phone AS user_phone, u.email AS user_email
       FROM technicians t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
      [req.params.id],
    );
    if (!techR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    const technician = techR.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userFields = [];
      const userVals = [];
      let ui = 1;
      if (body.fullName !== undefined) {
        userFields.push(`full_name = $${ui++}`);
        userVals.push(body.fullName);
      }
      if (body.phone !== undefined) {
        const phone = normalizePhone(body.phone);
        const dup = await client.query(`SELECT id FROM users WHERE phone = $1 AND id != $2`, [
          phone,
          technician.user_id,
        ]);
        if (dup.rows.length) throw new HttpError(409, 'PHONE_EXISTS', 'A user with this phone number already exists');
        userFields.push(`phone = $${ui++}`);
        userVals.push(phone);
      }
      if (body.email !== undefined) {
        userFields.push(`email = $${ui++}`);
        userVals.push(body.email);
      }
      if (userFields.length) {
        userVals.push(technician.user_id);
        await client.query(`UPDATE users SET ${userFields.join(', ')} WHERE id = $${ui}`, userVals);
      }

      const techFields = [];
      const techVals = [];
      let di = 1;
      if (body.displayName !== undefined) {
        techFields.push(`display_name = $${di++}`);
        techVals.push(body.displayName);
      }
      if (body.phoneBusiness !== undefined) {
        techFields.push(`phone_business = $${di++}`);
        techVals.push(body.phoneBusiness);
      }
      if (body.specializations !== undefined) {
        techFields.push(`specializations = $${di++}`);
        techVals.push(body.specializations);
      }
      if (body.description !== undefined) {
        techFields.push(`description = $${di++}`);
        techVals.push(body.description);
      }
      if (body.locationText !== undefined) {
        techFields.push(`location_text = $${di++}`);
        techVals.push(body.locationText);
      }
      if (body.lat !== undefined) {
        techFields.push(`lat = $${di++}`);
        techVals.push(body.lat);
      }
      if (body.lng !== undefined) {
        techFields.push(`lng = $${di++}`);
        techVals.push(body.lng);
      }
      if (body.serviceMode !== undefined) {
        techFields.push(`service_mode = $${di++}`);
        techVals.push(body.serviceMode);
      }
      if (body.operatingHours !== undefined) {
        techFields.push(`operating_hours = $${di++}`);
        techVals.push(body.operatingHours);
      }
      if (body.openOnHolidays !== undefined) {
        techFields.push(`open_on_holidays = $${di++}`);
        techVals.push(body.openOnHolidays);
      }
      if (body.bannerUrl !== undefined) {
        techFields.push(`banner_url = $${di++}`);
        techVals.push(body.bannerUrl);
      }
      if (body.onboardingStatus !== undefined) {
        techFields.push(`onboarding_status = $${di++}`);
        techVals.push(body.onboardingStatus);
        const newRole = body.onboardingStatus === 'approved' ? 'technician' : 'buyer';
        await client.query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, technician.user_id]);
      }
      if (techFields.length) {
        techVals.push(req.params.id);
        await client.query(`UPDATE technicians SET ${techFields.join(', ')} WHERE id = $${di}`, techVals);
      }

      const { rows } = await pool.query(
        `SELECT t.*, u.full_name AS user_full_name, u.phone AS user_phone, u.email AS user_email
         FROM technicians t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
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
    const techR = await pool.query(`SELECT * FROM technicians WHERE id = $1`, [req.params.id]);
    if (!techR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    const technician = techR.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM technicians WHERE id = $1`, [req.params.id]);
      await client.query(`UPDATE users SET role = 'buyer' WHERE id = $1`, [technician.user_id]);
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
      `UPDATE technicians SET is_verified = NOT is_verified WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const specialization = req.query.specialization ? String(req.query.specialization).trim() : '';
    const serviceMode = req.query.serviceMode ? String(req.query.serviceMode).trim() : '';
    const q = req.query.q ? String(req.query.q).trim() : '';
    const verifiedRaw = req.query.verified;
    const requireVerified = verifiedRaw !== 'false' && verifiedRaw !== '0';

    if (specialization && !VALID_SPECIALIZATIONS.includes(specialization)) {
      throw new HttpError(400, 'INVALID_SPECIALIZATION', 'Unknown specialization filter');
    }
    if (serviceMode && !['mobile', 'workshop', 'both'].includes(serviceMode)) {
      throw new HttpError(400, 'INVALID_SERVICE_MODE', 'Invalid serviceMode filter');
    }

    const where = [`t.onboarding_status = 'approved'`];
    const vals = [];
    let i = 1;
    if (requireVerified) {
      where.push(`t.is_verified = true`);
    }
    if (specialization) {
      where.push(`$${i++} = ANY(t.specializations)`);
      vals.push(specialization);
    }
    if (serviceMode) {
      where.push(`(t.service_mode = $${i++} OR t.service_mode = 'both')`);
      vals.push(serviceMode);
    }
    if (q) {
      where.push(`(t.display_name ILIKE $${i} OR t.location_text ILIKE $${i})`);
      vals.push(`%${q}%`);
      i++;
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const pool = getPool();
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM technicians t ${whereSql}`,
      vals,
    );
    const total = countR.rows[0].c;
    vals.push(pageSize, offset);
    const { rows } = await pool.query(
      `SELECT t.* FROM technicians t
       ${whereSql}
       ORDER BY t.rating_avg DESC NULLS LAST, t.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      vals,
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
    const { rows: techs } = await pool.query(`SELECT * FROM technicians WHERE id = $1`, [req.params.id]);
    if (!techs.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    const technician = techs[0];
    const revR = await pool.query(
      `SELECT r.*, u.full_name AS buyer_name
       FROM technician_reviews r
       JOIN users u ON u.id = r.buyer_id
       WHERE r.technician_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [technician.id],
    );
    res.json({
      data: {
        technician: keysToCamel(technician),
        reviews: revR.rows.map(keysToCamel),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
