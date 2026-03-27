import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyPaystackSignature } from '../src/services/paystack.js';

test('verifyPaystackSignature accepts valid HMAC', () => {
  process.env.PAYSTACK_WEBHOOK_SECRET = 'whsec_test';
  const body = Buffer.from(JSON.stringify({ event: 'charge.success' }), 'utf8');
  const sig = crypto.createHmac('sha512', 'whsec_test').update(body).digest('hex');
  assert.equal(verifyPaystackSignature(body, sig), true);
});

test('verifyPaystackSignature rejects bad signature', () => {
  process.env.PAYSTACK_WEBHOOK_SECRET = 'whsec_test';
  const body = Buffer.from('{}', 'utf8');
  assert.equal(verifyPaystackSignature(body, 'deadbeef'), false);
});
