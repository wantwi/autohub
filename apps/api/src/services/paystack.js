import crypto from 'crypto';
import { loadEnv } from '../config/env.js';

/**
 * @param {object} body Paystack initialize payload
 */
export async function paystackInitialize(body) {
  const { PAYSTACK_SECRET_KEY } = loadEnv();
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Paystack initialize failed');
  }
  return json.data;
}

/**
 * @param {string} reference
 */
export async function paystackVerify(reference) {
  const { PAYSTACK_SECRET_KEY } = loadEnv();
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    }
  );
  const json = await res.json();
  if (!json.status) {
    throw new Error(json.message || 'Paystack verify failed');
  }
  return json.data;
}

/**
 * Verify Paystack webhook signature (HMAC SHA512 of raw body with secret).
 * @param {Buffer|string} rawBody
 * @param {string|undefined} signatureHeader x-paystack-signature
 */
export function verifyPaystackSignature(rawBody, signatureHeader) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
  return hash === signatureHeader;
}
