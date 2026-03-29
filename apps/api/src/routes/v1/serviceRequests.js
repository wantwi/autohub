import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { parsePagination } from '../../lib/pagination.js';
import { sendPushToUser } from '../../services/pushNotify.js';
import { createNotification } from '../../services/notifyInApp.js';

const router = Router();

const createSchema = z.object({
  technicianId: z.string().uuid(),
  description: z.string().min(1),
  vehicleInfo: z.string().max(5000).optional().nullable(),
  preferredDate: z.string().max(50).optional().nullable(),
  preferredTime: z.string().max(50).optional().nullable(),
  serviceMode: z.enum(['mobile', 'workshop']).optional().nullable(),
});

const patchStatusSchema = z.object({
  status: z.enum(['accepted', 'declined', 'completed', 'cancelled']),
  technicianNote: z.string().max(5000).optional().nullable(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const pool = getPool();

    const { rows: techRows } = await pool.query(
      `SELECT id, user_id, onboarding_status FROM technicians WHERE id = $1`,
      [body.technicianId],
    );
    if (!techRows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');

    const tech = techRows[0];
    if (tech.onboarding_status !== 'approved') {
      throw new HttpError(400, 'TECH_NOT_APPROVED', 'Technician is not approved');
    }

    if (tech.user_id === req.user.id) {
      throw new HttpError(400, 'SELF_REQUEST', 'You cannot create a service request for yourself');
    }

    const preferredDate =
      body.preferredDate && String(body.preferredDate).trim() !== ''
        ? body.preferredDate
        : null;

    const { rows } = await pool.query(
      `INSERT INTO service_requests (
         buyer_id, technician_id, description, vehicle_info, preferred_date, preferred_time, service_mode, status
       ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, 'pending')
       RETURNING *`,
      [
        req.user.id,
        body.technicianId,
        body.description,
        body.vehicleInfo ?? null,
        preferredDate,
        body.preferredTime ?? null,
        body.serviceMode ?? null,
      ],
    );

    res.status(201).json({ data: keysToCamel(rows[0]) });

    const buyerName = await pool
      .query('SELECT full_name FROM users WHERE id = $1', [req.user.id])
      .then((r) => r.rows[0]?.full_name || 'A buyer');
    sendPushToUser(tech.user_id, {
      title: 'New Booking',
      body: `${buyerName} sent you a service request.`,
      url: '/technician/requests',
    }).catch(() => {});
    createNotification(tech.user_id, {
      type: 'booking_new',
      title: 'New Booking Request',
      body: `${buyerName} sent you a service request.`,
      link: '/technician/requests',
    }).catch(() => {});
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const pool = getPool();
    const statusFilter = req.query.status ? String(req.query.status).trim() : '';
    const allowed = ['pending', 'accepted', 'declined', 'completed', 'cancelled'];

    const where = ['sr.buyer_id = $1'];
    const vals = [req.user.id];
    let idx = 2;
    if (statusFilter && allowed.includes(statusFilter)) {
      where.push(`sr.status = $${idx++}`);
      vals.push(statusFilter);
    }
    const whereSql = where.join(' AND ');

    const c = await pool.query(`SELECT COUNT(*)::int AS c FROM service_requests sr WHERE ${whereSql}`, vals);

    const dataVals = [...vals, pageSize, offset];
    const { rows } = await pool.query(
      `SELECT sr.*, t.display_name AS technician_display_name
       FROM service_requests sr
       JOIN technicians t ON t.id = sr.technician_id
       WHERE ${whereSql}
       ORDER BY sr.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      dataVals,
    );

    res.json({
      data: rows.map((r) => keysToCamel(r)),
      meta: { page, pageSize, total: c.rows[0].c },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT sr.*,
              t.display_name AS technician_display_name,
              t.user_id AS technician_user_id,
              bu.full_name AS buyer_name,
              tu.full_name AS technician_user_name
       FROM service_requests sr
       JOIN technicians t ON t.id = sr.technician_id
       JOIN users bu ON bu.id = sr.buyer_id
       JOIN users tu ON tu.id = t.user_id
       WHERE sr.id = $1`,
      [id],
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Service request not found');

    const row = rows[0];
    const { technician_user_id: technicianUserId, ...publicRow } = row;
    const isBuyer = row.buyer_id === req.user.id;
    const isTechOwner = technicianUserId === req.user.id;

    if (!isBuyer && !isTechOwner) {
      throw new HttpError(403, 'FORBIDDEN', 'Not allowed to view this request');
    }

    res.json({ data: keysToCamel(publicRow) });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = patchStatusSchema.parse(req.body);
    const pool = getPool();

    const { rows } = await pool.query(`SELECT * FROM service_requests WHERE id = $1`, [id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Service request not found');
    const sr = rows[0];

    const { rows: techRows } = await pool.query(
      `SELECT user_id FROM technicians WHERE id = $1`,
      [sr.technician_id],
    );
    const techUserId = techRows[0]?.user_id;
    const isBuyer = sr.buyer_id === req.user.id;
    const isTechnicianOwner = techUserId === req.user.id;

    const techStatuses = ['accepted', 'declined', 'completed'];
    if (techStatuses.includes(body.status)) {
      if (!isTechnicianOwner) {
        throw new HttpError(403, 'FORBIDDEN', 'Only the assigned technician can set this status');
      }
    } else if (body.status === 'cancelled') {
      if (!isBuyer) {
        throw new HttpError(403, 'FORBIDDEN', 'Only the buyer can cancel this request');
      }
    }

    const fields = [`status = $1`, `updated_at = now()`];
    const vals = [body.status];
    let i = 2;
    if (body.technicianNote !== undefined) {
      fields.push(`technician_note = $${i++}`);
      vals.push(body.technicianNote);
    }
    vals.push(id);

    const { rows: updated } = await pool.query(
      `UPDATE service_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals,
    );

    res.json({ data: keysToCamel(updated[0]) });

    const statusLabels = { accepted: 'accepted', declined: 'declined', completed: 'marked complete', cancelled: 'cancelled' };
    const label = statusLabels[body.status] || body.status;

    if (['accepted', 'declined', 'completed'].includes(body.status)) {
      const techName = await pool
        .query(`SELECT t.display_name FROM technicians t WHERE t.user_id = $1`, [req.user.id])
        .then((r) => r.rows[0]?.display_name || 'Your technician');
      sendPushToUser(sr.buyer_id, {
        title: 'Booking Update',
        body: `${techName} ${label} your service request.`,
        url: '/bookings',
      }).catch(() => {});
      createNotification(sr.buyer_id, {
        type: `booking_${body.status}`,
        title: 'Booking Update',
        body: `${techName} ${label} your service request.`,
        link: '/bookings',
      }).catch(() => {});
    } else if (body.status === 'cancelled') {
      sendPushToUser(techUserId, {
        title: 'Booking Cancelled',
        body: `A buyer cancelled their service request.`,
        url: '/technician/requests',
      }).catch(() => {});
      createNotification(techUserId, {
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        body: 'A buyer cancelled their service request.',
        link: '/technician/requests',
      }).catch(() => {});
    }
  } catch (e) {
    next(e);
  }
});

export default router;
