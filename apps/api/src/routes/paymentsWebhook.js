import express from 'express';
import { getPool } from '../db/pool.js';
import { verifyPaystackSignature } from '../services/paystack.js';
import { sendSms } from '../services/sms.js';
import { normalizePhone } from '../lib/phone.js';

const raw = express.raw({ type: 'application/json' });

async function handler(req, res) {
  const sig = req.headers['x-paystack-signature'];
  const rawBody = req.body;
  if (!verifyPaystackSignature(rawBody, typeof sig === 'string' ? sig : undefined)) {
    return res.status(400).send('invalid signature');
  }
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('invalid json');
  }

  if (event.event !== 'charge.success') {
    return res.status(200).json({ received: true });
  }

  const ref = event.data?.reference;
  if (!ref) return res.status(200).json({ received: true });

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE reference = $1 OR paystack_ref = $1 LIMIT 1`,
      [ref]
    );
    if (!rows.length) return res.status(200).json({ received: true });
    const order = rows[0];
    if (order.payment_status === 'paid') {
      return res.status(200).json({ received: true, idempotent: true });
    }
    await pool.query(
      `UPDATE orders SET payment_status = 'paid', paid_at = now(), paystack_ref = $1, updated_at = now() WHERE id = $2`,
      [ref, order.id]
    );
    const dealer = (await pool.query(`SELECT * FROM dealers WHERE id = $1`, [order.dealer_id])).rows[0];
    if (dealer?.phone_business) {
      await sendSms(
        normalizePhone(dealer.phone_business),
        `Payment received for AutoHub order ${order.reference}. Please confirm within 2 hours.`
      );
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('[webhook]', e);
    return res.status(500).send('handler error');
  }
}

export const paystackWebhookStack = [raw, handler];
