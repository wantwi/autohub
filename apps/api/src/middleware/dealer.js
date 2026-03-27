import { getPool } from '../db/pool.js';
import { HttpError } from '../lib/httpError.js';
import { canDealerPublishParts } from '../lib/dealerOnboarding.js';

/**
 * Attaches req.dealer (row) for authenticated user. Dealer role or buyer with profile both OK for routes that need dealer row.
 */
export async function loadDealerProfile(req, res, next) {
  try {
    const pool = getPool();
    const r = await pool.query('SELECT * FROM dealers WHERE user_id = $1', [req.user.id]);
    if (!r.rows.length) {
      return next(new HttpError(403, 'NO_DEALER_PROFILE', 'Dealer profile required'));
    }
    req.dealer = r.rows[0];
    next();
  } catch (e) {
    next(e);
  }
}

export function requireApprovedDealer(req, _res, next) {
  if (!req.dealer) {
    return next(new HttpError(403, 'NO_DEALER_PROFILE', 'Dealer profile required'));
  }
  const status = req.dealer.onboarding_status || 'pending';
  if (!canDealerPublishParts(status)) {
    return next(
      new HttpError(
        403,
        'DEALER_NOT_APPROVED',
        'Your dealer application is pending or rejected. Approval is required to publish parts.',
        { onboardingStatus: status },
      ),
    );
  }
  next();
}
