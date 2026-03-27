import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { loadEnv } from '../config/env.js';

/**
 * @param {{ sub: string, role: string }} payload
 */
export function signAccessToken(payload) {
  const { JWT_SECRET, JWT_EXPIRES_IN } = loadEnv();
  const jti = randomUUID();
  return {
    token: jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
    jti,
    expiresIn: JWT_EXPIRES_IN,
  };
}

/**
 * @param {string} token
 */
export function verifyAccessToken(token) {
  const { JWT_SECRET } = loadEnv();
  return /** @type {{ sub: string, role: string, jti: string, iat: number, exp: number }} */ (
    jwt.verify(token, JWT_SECRET)
  );
}
