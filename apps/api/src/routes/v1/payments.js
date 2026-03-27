import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { requireAuth } from '../../middleware/auth.js';
import { paystackInitialize, paystackVerify } from '../../services/paystack.js';
import { sendSms } from '../../services/sms.js';
import { normalizePhone } from '../../lib/phone.js';

const router = Router();

const initSchema = z.object({
  orderId: z.string().uuid(),
});

router.post('/initialize', requireAuth, async (req, res, next) => {
  try {
    const { orderId } = initSchema.parse(req.body);
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT o.*, u.email AS buyer_email, u.phone AS buyer_phone, u.full_name AS buyer_name
       FROM orders o JOIN users u ON u.id = o.buyer_id WHERE o.id = $1`,
      [orderId]
    );
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const order = rows[0];
    if (order.buyer_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Not your order');
    }
    if (order.payment_status === 'paid') {
      throw new HttpError(400, 'ALREADY_PAID', 'Order already paid');
    }
    if (order.status === 'cancelled') {
      throw new HttpError(400, 'INVALID_STATE', 'Cannot pay for a cancelled order');
    }

    const email =
      order.buyer_email ||
      (order.buyer_phone ? `${order.buyer_phone.replace(/\+/g, '')}@autohub.placeholder` : null) ||
      'buyer@autohub.placeholder';

    const amountPesewas = Math.round(Number(order.total_amount) * 100);
    if (amountPesewas < 100) {
      throw new HttpError(400, 'AMOUNT_TOO_LOW', 'Minimum payable amount not met');
    }

    const data = await paystackInitialize({
      email,
      amount: amountPesewas,
      currency: 'GHS',
      reference: order.reference,
      metadata: {
        order_id: order.id,
        order_reference: order.reference,
        custom_fields: [
          { display_name: 'Order', variable_name: 'order_reference', value: order.reference },
        ],
      },
    });

    await pool.query(`UPDATE orders SET paystack_ref = $1, updated_at = now() WHERE id = $2`, [
      data.reference,
      order.id,
    ]);

    res.json({
      data: {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference: data.reference,
        orderId: order.id,
        orderReference: order.reference,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/verify/:reference', requireAuth, async (req, res, next) => {
  try {
    const reference = req.params.reference;
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM orders WHERE reference = $1 OR paystack_ref = $1`, [
      reference,
    ]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const order = rows[0];
    if (order.buyer_id !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Not your order');
    }
    const data = await paystackVerify(reference);
    const success = data.status === 'success';
    if (success && order.payment_status !== 'paid') {
      await pool.query(
        `UPDATE orders SET payment_status = 'paid', paid_at = now(), paystack_ref = $1, updated_at = now() WHERE id = $2`,
        [data.reference ?? reference, order.id]
      );
      const dealer = (await pool.query(`SELECT * FROM dealers WHERE id = $1`, [order.dealer_id])).rows[0];
      if (dealer?.phone_business) {
        await sendSms(
          normalizePhone(dealer.phone_business),
          `Payment received for AutoHub order ${order.reference}. Please confirm within 2 hours.`
        );
      }
    }
    res.json({
      data: {
        paystackStatus: data.status,
        paid: success,
        order: keysToCamel(
          (await pool.query(`SELECT * FROM orders WHERE id = $1`, [order.id])).rows[0]
        ),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
