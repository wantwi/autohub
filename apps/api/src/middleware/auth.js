import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from '../lib/httpError.js';
import { getPool } from '../db/pool.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Missing Bearer token');
    }
    const token = h.slice(7);
    const payload = verifyAccessToken(token);
    const pool = getPool();
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [payload.jti]);
    if (r.rowCount) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Token has been revoked');
    }
    req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * @param {string[]} roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'UNAUTHORIZED', 'Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
}
