import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';
import { parsePagination } from '../../lib/pagination.js';
import { generateOrderReference } from '../../lib/orderRef.js';
import { requireAuth } from '../../middleware/auth.js';
import { loadDealerProfile } from '../../middleware/dealer.js';
import { runAutoCancelPendingOrders } from '../../orders/autoCancel.js';
import { sendSms } from '../../services/sms.js';
import { normalizePhone } from '../../lib/phone.js';
import { formatOrderForViewer } from '../../lib/orderFormat.js';

const router = Router();

const createOrderSchema = z.object({
  partId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  deliveryType: z.enum(['pickup', 'delivery']),
  deliveryAddress: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(5000).optional().nullable(),
});

async function appendHistory(client, orderId, status, note = null) {
  await client.query(
    `INSERT INTO order_status_history (order_id, status, note) VALUES ($1,$2,$3)`,
    [orderId, status, note]
  );
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const pool = getPool();
    const partR = await pool.query(`SELECT * FROM parts WHERE id = $1`, [body.partId]);
    if (!partR.rows.length) throw new HttpError(404, 'NOT_FOUND', 'Part not found');
    const part = partR.rows[0];
    if (!part.is_available) throw new HttpError(400, 'UNAVAILABLE', 'Part is not available');
    if (body.quantity > part.quantity) {
      throw new HttpError(400, 'INSUFFICIENT_QTY', 'Not enough stock');
    }

    let ref = generateOrderReference();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let k = 0; k < 5; k++) {
        try {
          const ins = await client.query(
            `INSERT INTO orders (
               reference, buyer_id, dealer_id, part_id, quantity, unit_price, total_amount,
               delivery_type, delivery_address, status, payment_status, notes, confirm_deadline_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','unpaid',$10, now() + interval '2 hours')
             RETURNING *`,
            [
              ref,
              req.user.id,
              part.dealer_id,
              part.id,
              body.quantity,
              part.price,
              Number(part.price) * body.quantity,
              body.deliveryType,
              body.deliveryAddress ?? null,
              body.notes ?? null,
            ]
          );
          await appendHistory(client, ins.rows[0].id, 'pending', 'created');
          await client.query('COMMIT');
          const order = ins.rows[0];
          const dealerR = await pool.query(`SELECT * FROM dealers WHERE id = $1`, [part.dealer_id]);
          const dealer = dealerR.rows[0];
          const phone = normalizePhone(dealer.phone_business);
          await sendSms(
            phone,
            `New AutoHub order ${ref}. Open your dealer dashboard to confirm within 2 hours.`
          );
          res.status(201).json({ data: keysToCamel(order) });
          return;
        } catch (e) {
          if (e.code === '23505') {
            ref = generateOrderReference();
            continue;
          }
          throw e;
        }
      }
      throw new HttpError(500, 'REFERENCE_COLLISION', 'Could not allocate order reference');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    await runAutoCancelPendingOrders();
    const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize);
    const pool = getPool();
    const c = await pool.query(`SELECT COUNT(*)::int AS c FROM orders WHERE buyer_id = $1`, [
      req.user.id,
    ]);
    const { rows } = await pool.query(
      `SELECT o.* FROM orders o WHERE o.buyer_id = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, pageSize, offset]
    );
    res.json({
      data: rows.map((r) => formatOrderForViewer(r, { role: 'buyer' })),
      meta: { page, pageSize, total: c.rows[0].c },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    await runAutoCancelPendingOrders();
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const order = rows[0];
    const buyerR = await pool.query(`SELECT id, phone, full_name FROM users WHERE id = $1`, [
      order.buyer_id,
    ]);
    const buyer = buyerR.rows[0];
    const dealerR = await pool.query(`SELECT user_id FROM dealers WHERE id = $1`, [order.dealer_id]);
    const dealerUserId = dealerR.rows[0]?.user_id;

    let role = 'buyer';
    if (req.user.role === 'admin') role = 'admin';
    else if (order.buyer_id === req.user.id) role = 'buyer';
    else if (dealerUserId === req.user.id) role = 'dealer';
    else throw new HttpError(403, 'FORBIDDEN', 'Cannot view this order');

    res.json({
      data: formatOrderForViewer(order, {
        role,
        buyerRow: buyer,
      }),
    });
  } catch (e) {
    next(e);
  }
});

async function loadOrderForDealer(pool, orderId, dealerId) {
  const { rows } = await pool.query(
    `SELECT * FROM orders WHERE id = $1 AND dealer_id = $2`,
    [orderId, dealerId]
  );
  if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
  return rows[0];
}

router.patch('/:id/confirm', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    const pool = getPool();
    const order = await loadOrderForDealer(pool, req.params.id, req.dealer.id);
    if (order.status !== 'pending') {
      throw new HttpError(400, 'INVALID_STATE', 'Order cannot be confirmed in current state');
    }
    if (order.payment_status !== 'paid') {
      throw new HttpError(400, 'NOT_PAID', 'Payment required before confirmation');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE orders SET status = 'confirmed', updated_at = now() WHERE id = $1 RETURNING *`,
        [order.id]
      );
      await appendHistory(client, order.id, 'confirmed', null);
      await client.query('COMMIT');
      const buyer = (
        await pool.query(`SELECT phone FROM users WHERE id = $1`, [order.buyer_id])
      ).rows[0];
      if (buyer?.phone) {
        await sendSms(
          normalizePhone(buyer.phone),
          `Your AutoHub order ${order.reference} was confirmed by the dealer.`
        );
      }
      res.json({ data: keysToCamel(rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/dispatch', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    const pool = getPool();
    const order = await loadOrderForDealer(pool, req.params.id, req.dealer.id);
    if (order.status !== 'confirmed') {
      throw new HttpError(400, 'INVALID_STATE', 'Order must be confirmed before dispatch');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE orders SET status = 'dispatched', updated_at = now() WHERE id = $1 RETURNING *`,
        [order.id]
      );
      await appendHistory(client, order.id, 'dispatched', null);
      await client.query('COMMIT');
      res.json({ data: keysToCamel(rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

/** Pilot: mark delivered (not in PRD table; enables review + timeline). Dealer-only. */
router.patch('/:id/delivered', requireAuth, loadDealerProfile, async (req, res, next) => {
  try {
    const pool = getPool();
    const order = await loadOrderForDealer(pool, req.params.id, req.dealer.id);
    if (order.status !== 'dispatched') {
      throw new HttpError(400, 'INVALID_STATE', 'Order must be dispatched first');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE orders SET status = 'delivered', updated_at = now() WHERE id = $1 RETURNING *`,
        [order.id]
      );
      await appendHistory(client, order.id, 'delivered', null);
      await client.query('COMMIT');
      res.json({ data: keysToCamel(rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const order = rows[0];
    const dealerR = await pool.query(`SELECT * FROM dealers WHERE id = $1`, [order.dealer_id]);
    const dealer = dealerR.rows[0];

    const isBuyer = order.buyer_id === req.user.id;
    const isDealer = dealer.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isDealer && !isAdmin) {
      throw new HttpError(403, 'FORBIDDEN', 'Cannot cancel this order');
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new HttpError(400, 'INVALID_STATE', 'Order cannot be cancelled');
    }

    if (isAdmin) {
      /* allowed for any non-terminal (already checked) */
    } else if (isDealer) {
      if (order.status !== 'pending') {
        throw new HttpError(400, 'INVALID_STATE', 'Dealer can only decline pending orders');
      }
    } else if (isBuyer) {
      if (order.status !== 'pending' || order.payment_status !== 'unpaid') {
        throw new HttpError(400, 'INVALID_STATE', 'Buyer can only cancel unpaid pending orders');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const up = await client.query(
        `UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *`,
        [order.id]
      );
      await appendHistory(
        client,
        order.id,
        'cancelled',
        isDealer ? 'dealer_declined' : isAdmin ? 'admin_cancelled' : 'buyer_cancelled'
      );
      await client.query('COMMIT');
      res.json({ data: keysToCamel(up.rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

router.post('/:id/review', requireAuth, async (req, res, next) => {
  try {
    const body = reviewSchema.parse(req.body);
    const pool = getPool();
    const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
    if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const order = rows[0];
    if (order.buyer_id !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Only the buyer can review');
    }
    if (!['dispatched', 'delivered', 'completed'].includes(order.status)) {
      throw new HttpError(400, 'INVALID_STATE', 'Order not eligible for review yet');
    }
    if (order.payment_status !== 'paid') {
      throw new HttpError(400, 'INVALID_STATE', 'Order must be paid before review');
    }
    try {
      const { rows: rev } = await pool.query(
        `INSERT INTO reviews (order_id, dealer_id, buyer_id, rating, comment)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [order.id, order.dealer_id, req.user.id, body.rating, body.comment ?? null]
      );
      res.status(201).json({ data: keysToCamel(rev[0]) });
    } catch (e) {
      if (e.code === '23505') {
        throw new HttpError(409, 'DUPLICATE_REVIEW', 'This order was already reviewed');
      }
      throw e;
    }
  } catch (e) {
    next(e);
  }
});

export default router;
