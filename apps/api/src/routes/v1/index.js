import { Router } from 'express';
import authRouter from './auth.js';
import usersRouter from './users.js';
import dealersRouter from './dealers.js';
import techniciansRouter from './technicians.js';
import { adminPartsRouter, dealerPartsRouter, partsPublicRouter } from './parts.js';
import ordersRouter from './orders.js';
import paymentsRouter from './payments.js';
import reviewsRouter from './reviews.js';
import technicianReviewsRouter from './technicianReviews.js';
import imagesRouter from './images.js';
import chatRouter from './chat.js';
import serviceRequestsRouter from './serviceRequests.js';
import pushRouter from './push.js';
import notificationsRouter from './notifications.js';
import reportsRouter from './reports.js';
import feedbackRouter from './feedback.js';
import analyticsRouter from './analytics.js';
import cronRouter from './cron.js';

const router = Router();

router.get('/health', async (req, res, next) => {
  try {
    const { pingDatabase } = await import('../../db/pool.js');
    const rawMs = process.env.HEALTH_DB_TIMEOUT_MS;
    const connectMs = rawMs ? Math.min(Math.max(Number(rawMs) || 15000, 3000), 120000) : 15000;
    const ping = await pingDatabase(connectMs);
    if (ping.ok) {
      return res.json({ data: { ok: true, service: 'autohub-api', database: 'connected' } });
    }
    const e = ping.error;
    const msg = e && typeof e.message === 'string' ? e.message : '';
    const poolTimedOut =
      msg.includes('Connection terminated due to connection timeout') ||
      msg.includes('timeout exceeded when trying to connect');
    if (poolTimedOut) {
      return res.status(200).json({
        data: {
          ok: true,
          service: 'autohub-api',
          database: 'disconnected',
          hint:
            'Postgres handshake timed out (pooler/TLS). From apps/api run: npm run probe-db. Confirm Session pooler URI in Supabase → Connect, reset DB password if unsure, try another network/VPN off, or set DATABASE_CONNECTION_TIMEOUT_MS=180000.',
        },
      });
    }
    const networkDown =
      e &&
      (e.code === 'ECONNREFUSED' ||
        e.code === 'ENOTFOUND' ||
        e.code === 'ETIMEDOUT' ||
        e.code === 'EAI_AGAIN');
    if (networkDown) {
      const usesDirectDbHost =
        process.env.DATABASE_URL?.includes('.supabase.co') &&
        process.env.DATABASE_URL?.includes('db.') &&
        !process.env.DATABASE_URL?.includes('pooler.supabase.com');
      return res.status(200).json({
        data: {
          ok: true,
          service: 'autohub-api',
          database: 'disconnected',
          ...(process.env.NODE_ENV !== 'production' ? { errorCode: e.code } : {}),
          hint: usesDirectDbHost
            ? 'DATABASE_URL uses direct db.*.supabase.co (IPv6). Replace with Session pooler from Supabase → Connect: user postgres.PROJECT_REF, host aws-0-YOUR_REGION.pooler.supabase.com:5432. Match REGION to Project Settings → General.'
            : 'Cannot reach Postgres. Confirm DATABASE_URL, firewall, and Supabase region (pooler host must match your project region).',
        },
      });
    }
    if (e && e.code === '28P01') {
      return res.status(200).json({
        data: {
          ok: true,
          service: 'autohub-api',
          database: 'disconnected',
          hint: 'Wrong database password (28P01). Reset DB password in Supabase and update DATABASE_URL.',
        },
      });
    }
    next(e);
  } catch (err) {
    next(err);
  }
});

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/dealers', dealersRouter);
router.use('/technicians', techniciansRouter);
router.use('/dealers', dealerPartsRouter);
router.use('/admin', adminPartsRouter);
router.use('/parts', partsPublicRouter);
router.use('/orders', ordersRouter);
router.use('/payments', paymentsRouter);
router.use('/', reviewsRouter);
router.use('/', technicianReviewsRouter);
router.use('/images', imagesRouter);
router.use('/conversations', chatRouter);
router.use('/service-requests', serviceRequestsRouter);
router.use('/push', pushRouter);
router.use('/notifications', notificationsRouter);
router.use('/reports', reportsRouter);
router.use('/feedback', feedbackRouter);
router.use('/analytics', analyticsRouter);
router.use('/cron', cronRouter);

export default router;
