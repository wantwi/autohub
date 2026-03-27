import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { getPool } from '../../db/pool.js';
import { loadEnv } from '../../config/env.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { signAccessToken, verifyAccessToken } from '../../lib/jwt.js';
import { normalizePhone } from '../../lib/phone.js';
import { sendSms } from '../../services/sms.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

const otpRequestSchema = z.object({
  phone: z.string().min(8).max(20),
});

const otpVerifySchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().min(4).max(8),
});

const googleSchema = z.object({
  idToken: z.string().min(10),
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many OTP requests' } },
});

function randomOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post('/request-otp', otpLimiter, async (req, res, next) => {
  try {
    const { phone: raw } = otpRequestSchema.parse(req.body);
    const phone = normalizePhone(raw);
    const env = loadEnv();
    const code = env.DEV_OTP && env.NODE_ENV !== 'production' ? env.DEV_OTP : randomOtp6();
    const hash = await bcrypt.hash(code, 10);
    const pool = getPool();
    await pool.query(
      `INSERT INTO otp_codes (phone, code_hash, expires_at)
       VALUES ($1, $2, now() + interval '5 minutes')`,
      [phone, hash]
    );
    if (!env.DEV_OTP || env.NODE_ENV === 'production') {
      await sendSms(phone, `Your AutoHub code is ${code}. It expires in 5 minutes.`);
    } else {
      console.info('[dev-otp]', phone, code);
    }
    res.status(200).json({
      data: { sent: true, ...(env.DEV_OTP && env.NODE_ENV !== 'production' ? { devCode: code } : {}) },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/verify-otp', otpLimiter, async (req, res, next) => {
  try {
    const body = otpVerifySchema.parse(req.body);
    const phone = normalizePhone(body.phone);
    const pool = getPool();
    const env = loadEnv();

    let valid = false;
    if (env.DEV_OTP && env.NODE_ENV !== 'production' && body.code === env.DEV_OTP) {
      valid = true;
    } else {
      const { rows } = await pool.query(
        `SELECT id, code_hash, attempts FROM otp_codes
         WHERE phone = $1 AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );
      if (!rows.length) throw new HttpError(400, 'OTP_INVALID', 'Code expired or not found');
      const row = rows[0];
      if (row.attempts >= 5) throw new HttpError(429, 'OTP_LOCKED', 'Too many attempts');
      const ok = await bcrypt.compare(body.code, row.code_hash);
      await pool.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
      if (!ok) throw new HttpError(400, 'OTP_INVALID', 'Invalid code');
      valid = true;
    }

    if (!valid) throw new HttpError(400, 'OTP_INVALID', 'Invalid code');

    const userResult = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = userResult.rows[0];
    if (!user) {
      throw new HttpError(404, 'ACCOUNT_NOT_FOUND',
        'No account found with this phone number. Use Google sign-in to create a buyer account.');
    }

    const { token, jti, expiresIn } = signAccessToken({ sub: user.id, role: user.role });
    res.json({
      data: {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn,
        user: keysToCamel(user),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/google', otpLimiter, async (req, res, next) => {
  try {
    const { idToken } = googleSchema.parse(req.body);
    const env = loadEnv();
    if (!env.GOOGLE_CLIENT_ID) {
      throw new HttpError(501, 'NOT_CONFIGURED', 'Google sign-in is not configured');
    }
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new HttpError(400, 'GOOGLE_EMAIL_REQUIRED', 'Google account has no email');
    }
    const pool = getPool();
    let userResult = await pool.query(
      'SELECT * FROM users WHERE google_sub = $1 OR email = $2',
      [payload.sub, payload.email]
    );
    let user = userResult.rows[0];
    if (!user) {
      const ins = await pool.query(
        `INSERT INTO users (email, full_name, role, google_sub)
         VALUES ($1, $2, 'buyer', $3) RETURNING *`,
        [payload.email, payload.name || 'AutoHub User', payload.sub]
      );
      user = ins.rows[0];
    } else if (!user.google_sub) {
      await pool.query(`UPDATE users SET google_sub = $1, email = COALESCE(email, $2) WHERE id = $3`, [
        payload.sub,
        payload.email,
        user.id,
      ]);
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
      user = userResult.rows[0];
    }

    const { token, jti, expiresIn } = signAccessToken({ sub: user.id, role: user.role });
    res.json({
      data: {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn,
        user: keysToCamel(user),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'User not found');
    res.json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : '';
    const payload = verifyAccessToken(token);
    const pool = getPool();
    await pool.query(
      `INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT (jti) DO NOTHING`,
      [payload.jti, payload.exp]
    );
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
