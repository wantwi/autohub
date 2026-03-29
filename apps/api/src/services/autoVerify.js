import { getPool } from '../db/pool.js';
import { createNotification } from './notifyInApp.js';
import { sendPushToUser } from './pushNotify.js';

const MIN_REVIEWS = 5;
const MIN_AVG_RATING = 4.0;
const MIN_CONVERSATION_PCT = 0.8;
const MIN_AGE_DAYS = 90;

async function verifyDealers(pool) {
  const { rows: candidates } = await pool.query(`
    SELECT d.id, d.user_id, d.shop_name, d.rating_avg, d.rating_count,
           d.description, d.banner_url, d.phone_business, d.location_text,
           d.created_at
    FROM dealers d
    WHERE d.onboarding_status = 'approved'
      AND d.is_verified = false
      AND d.rating_count >= $1
      AND d.rating_avg >= $2
      AND d.created_at <= now() - ($3 || ' days')::interval
  `, [MIN_REVIEWS, MIN_AVG_RATING, MIN_AGE_DAYS]);

  const upgraded = [];

  for (const dealer of candidates) {
    const profileComplete = Boolean(
      dealer.shop_name && dealer.description && dealer.phone_business
      && dealer.location_text && dealer.banner_url
    );
    if (!profileComplete) continue;

    const { rows: [{ count: reportCount }] } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM reports
       WHERE reported_user_id = $1 AND status = 'pending'`,
      [dealer.user_id],
    );
    if (reportCount > 0) continue;

    const { rows: [{ total_reviewers, reviewers_with_conv }] } = await pool.query(`
      SELECT
        COUNT(DISTINCT r.buyer_id)::int AS total_reviewers,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN r.buyer_id END)::int AS reviewers_with_conv
      FROM reviews r
      LEFT JOIN conversations c
        ON c.buyer_id = r.buyer_id AND c.dealer_id = $1
      WHERE r.dealer_id = $1
    `, [dealer.id]);

    if (total_reviewers === 0) continue;
    const convPct = reviewers_with_conv / total_reviewers;
    if (convPct < MIN_CONVERSATION_PCT) continue;

    await pool.query(
      `UPDATE dealers SET is_verified = true, verified_at = now() WHERE id = $1`,
      [dealer.id],
    );
    upgraded.push(dealer);

    createNotification(dealer.user_id, {
      type: 'verified',
      title: 'You\'re now Verified!',
      body: `Congratulations! ${dealer.shop_name} has earned the Verified badge based on your reviews and track record.`,
      link: '/dealer/dashboard',
    }).catch(() => {});
    sendPushToUser(dealer.user_id, {
      title: 'You\'re Verified!',
      body: `${dealer.shop_name} has earned the Verified badge. Well done!`,
      url: '/dealer/dashboard',
    }).catch(() => {});
  }

  return upgraded;
}

async function verifyTechnicians(pool) {
  const { rows: candidates } = await pool.query(`
    SELECT t.id, t.user_id, t.display_name, t.rating_avg, t.rating_count,
           t.description, t.banner_url, t.phone_business, t.location_text,
           t.specializations, t.created_at
    FROM technicians t
    WHERE t.onboarding_status = 'approved'
      AND t.is_verified = false
      AND t.rating_count >= $1
      AND t.rating_avg >= $2
      AND t.created_at <= now() - ($3 || ' days')::interval
  `, [MIN_REVIEWS, MIN_AVG_RATING, MIN_AGE_DAYS]);

  const upgraded = [];

  for (const tech of candidates) {
    const specs = Array.isArray(tech.specializations) ? tech.specializations : [];
    const profileComplete = Boolean(
      tech.display_name && tech.description && tech.phone_business
      && tech.location_text && tech.banner_url && specs.length > 0
    );
    if (!profileComplete) continue;

    const { rows: [{ count: reportCount }] } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM reports
       WHERE reported_user_id = $1 AND status = 'pending'`,
      [tech.user_id],
    );
    if (reportCount > 0) continue;

    const { rows: [{ total_reviewers, reviewers_with_conv }] } = await pool.query(`
      SELECT
        COUNT(DISTINCT r.buyer_id)::int AS total_reviewers,
        COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN r.buyer_id END)::int AS reviewers_with_conv
      FROM technician_reviews r
      LEFT JOIN conversations c
        ON c.buyer_id = r.buyer_id AND c.technician_id = $1
      WHERE r.technician_id = $1
    `, [tech.id]);

    if (total_reviewers === 0) continue;
    const convPct = reviewers_with_conv / total_reviewers;
    if (convPct < MIN_CONVERSATION_PCT) continue;

    await pool.query(
      `UPDATE technicians SET is_verified = true, verified_at = now() WHERE id = $1`,
      [tech.id],
    );
    upgraded.push(tech);

    createNotification(tech.user_id, {
      type: 'verified',
      title: 'You\'re now Verified!',
      body: `Congratulations! ${tech.display_name} has earned the Verified badge based on your reviews and track record.`,
      link: '/technician/dashboard',
    }).catch(() => {});
    sendPushToUser(tech.user_id, {
      title: 'You\'re Verified!',
      body: `${tech.display_name} has earned the Verified badge. Well done!`,
      url: '/technician/dashboard',
    }).catch(() => {});
  }

  return upgraded;
}

export async function runAutoVerification() {
  const pool = getPool();
  const dealers = await verifyDealers(pool);
  const technicians = await verifyTechnicians(pool);
  return {
    dealersVerified: dealers.length,
    techniciansVerified: technicians.length,
    dealers: dealers.map((d) => ({ id: d.id, name: d.shop_name })),
    technicians: technicians.map((t) => ({ id: t.id, name: t.display_name })),
  };
}
