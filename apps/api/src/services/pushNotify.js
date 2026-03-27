import webpush from 'web-push';
import { getPool } from '../db/pool.js';
import { loadEnv } from '../config/env.js';

let configured = false;

function ensureVapid() {
  if (configured) return true;
  const env = loadEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

/**
 * Send a push notification to all subscriptions for a given user.
 * Silently removes expired/invalid subscriptions (410 Gone).
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, icon?: string }} payload
 */
export async function sendPushToUser(userId, payload) {
  if (!ensureVapid()) return;

  const pool = getPool();
  const { rows: subs } = await pool.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId],
  );

  if (!subs.length) return;

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icon-192.png',
  });

  const expiredIds = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload,
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          console.error('[push] send failed:', sub.endpoint.slice(0, 60), err.statusCode || err.message);
        }
      }
    }),
  );

  if (expiredIds.length) {
    await pool
      .query('DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])', [expiredIds])
      .catch(() => {});
  }
}
