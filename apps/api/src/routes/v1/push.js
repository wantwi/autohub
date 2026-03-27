import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { getPool } from '../../db/pool.js';
import { loadEnv } from '../../config/env.js';

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

router.get('/vapid-key', (_req, res) => {
  const env = loadEnv();
  res.json({ data: { publicKey: env.VAPID_PUBLIC_KEY } });
});

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const body = subscribeSchema.parse(req.body);
    const pool = getPool();

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
      [req.user.id, body.endpoint, body.keys.p256dh, body.keys.auth],
    );

    res.status(201).json({ data: { subscribed: true } });
  } catch (e) {
    next(e);
  }
});

router.delete('/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body);
    const pool = getPool();

    await pool.query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [req.user.id, endpoint],
    );

    res.json({ data: { unsubscribed: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
