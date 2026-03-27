import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/httpError.js';
import { keysToCamel } from '../../lib/format.js';

const router = Router();

async function insertPartCardMessage(pool, conversationId, senderId, partId) {
  const { rows: partRows } = await pool.query(
    `SELECT id, name, price, images FROM parts WHERE id = $1`,
    [partId],
  );
  if (!partRows.length) return;
  const p = partRows[0];
  const image = Array.isArray(p.images) && p.images.length ? p.images[0] : null;
  const payload = { partId: p.id, name: p.name, price: p.price, image };

  const { rows } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, body, attachment_type, payload)
     VALUES ($1, $2, $3, 'part_card', $4) RETURNING *`,
    [conversationId, senderId, `Hi, I\u2019m interested in: ${p.name}`, JSON.stringify(payload)],
  );
  await pool.query(
    `UPDATE conversations SET last_message_at = $1 WHERE id = $2`,
    [rows[0].created_at, conversationId],
  );
}

const createConversationSchema = z.object({
  dealerId: z.string().uuid().optional().nullable(),
  technicianId: z.string().uuid().optional().nullable(),
  buyerId: z.string().uuid().optional().nullable(),
  partId: z.string().uuid().optional().nullable(),
}).refine(d => d.dealerId || d.technicianId || d.buyerId, {
  message: 'Either dealerId, technicianId, or buyerId is required',
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT
         c.*,
         d.shop_name       AS dealer_shop_name,
         d.user_id         AS dealer_user_id,
         t.display_name    AS technician_display_name,
         t.user_id         AS technician_user_id,
         bu.full_name      AS buyer_name,
         p.name            AS part_name,
         p.images          AS part_images,
         (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
         (SELECT attachment_type FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_attachment_type,
         (SELECT sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_id,
         (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false) AS unread_count
       FROM conversations c
       LEFT JOIN dealers d ON d.id = c.dealer_id
       LEFT JOIN technicians t ON t.id = c.technician_id
       JOIN users bu ON bu.id = c.buyer_id
       LEFT JOIN parts p ON p.id = c.part_id
       WHERE c.buyer_id = $1
          OR (d.user_id IS NOT NULL AND d.user_id = $1)
          OR (t.user_id IS NOT NULL AND t.user_id = $1)
       ORDER BY c.last_message_at DESC`,
      [userId],
    );

    res.json({ data: rows.map(keysToCamel) });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { dealerId, technicianId, buyerId: targetBuyerId, partId } = createConversationSchema.parse(req.body);
    const pool = getPool();
    const callerUserId = req.user.id;
    const normalizedPartId = partId ?? null;

    // Technician initiating a chat with a buyer
    if (targetBuyerId) {
      const { rows: techRows } = await pool.query(
        'SELECT id, user_id FROM technicians WHERE user_id = $1',
        [callerUserId],
      );
      if (!techRows.length) throw new HttpError(403, 'FORBIDDEN', 'Only technicians can start a conversation by buyerId');
      if (targetBuyerId === callerUserId) throw new HttpError(400, 'SELF_CHAT', 'You cannot message yourself');

      const techId = techRows[0].id;
      const { rows: existing } = await pool.query(
        `SELECT * FROM conversations
         WHERE buyer_id = $1 AND technician_id = $2 AND dealer_id IS NULL`,
        [targetBuyerId, techId],
      );
      if (existing.length) return res.json({ data: keysToCamel(existing[0]) });

      const { rows } = await pool.query(
        `INSERT INTO conversations (buyer_id, technician_id)
         VALUES ($1, $2) RETURNING *`,
        [targetBuyerId, techId],
      );
      return res.status(201).json({ data: keysToCamel(rows[0]) });
    }

    const buyerId = callerUserId;

    if (dealerId) {
      const { rows: dealerRows } = await pool.query(
        'SELECT id, user_id FROM dealers WHERE id = $1',
        [dealerId],
      );
      if (!dealerRows.length) throw new HttpError(404, 'NOT_FOUND', 'Dealer not found');
      if (dealerRows[0].user_id === buyerId) {
        throw new HttpError(400, 'SELF_CHAT', 'You cannot message your own shop');
      }

      const { rows: existing } = await pool.query(
        `SELECT * FROM conversations
         WHERE buyer_id = $1 AND dealer_id = $2 AND (part_id = $3 OR ($3::uuid IS NULL AND part_id IS NULL))`,
        [buyerId, dealerId, normalizedPartId],
      );
      if (existing.length) {
        if (normalizedPartId) {
          const { rows: hasCard } = await pool.query(
            `SELECT 1 FROM messages WHERE conversation_id = $1 AND attachment_type = 'part_card' LIMIT 1`,
            [existing[0].id],
          );
          if (!hasCard.length) {
            await insertPartCardMessage(pool, existing[0].id, buyerId, normalizedPartId);
          }
        }
        return res.json({ data: keysToCamel(existing[0]) });
      }

      const { rows } = await pool.query(
        `INSERT INTO conversations (buyer_id, dealer_id, part_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [buyerId, dealerId, normalizedPartId],
      );
      if (normalizedPartId) {
        await insertPartCardMessage(pool, rows[0].id, buyerId, normalizedPartId);
      }
      return res.status(201).json({ data: keysToCamel(rows[0]) });
    }

    const { rows: techRows } = await pool.query(
      'SELECT id, user_id FROM technicians WHERE id = $1',
      [technicianId],
    );
    if (!techRows.length) throw new HttpError(404, 'NOT_FOUND', 'Technician not found');
    if (techRows[0].user_id === buyerId) {
      throw new HttpError(400, 'SELF_CHAT', 'You cannot message yourself');
    }

    const { rows: existing } = await pool.query(
      `SELECT * FROM conversations
       WHERE buyer_id = $1 AND technician_id = $2 AND dealer_id IS NULL AND (part_id = $3 OR ($3::uuid IS NULL AND part_id IS NULL))`,
      [buyerId, technicianId, normalizedPartId],
    );
    if (existing.length) {
      if (normalizedPartId) {
        const { rows: hasCard } = await pool.query(
          `SELECT 1 FROM messages WHERE conversation_id = $1 AND attachment_type = 'part_card' LIMIT 1`,
          [existing[0].id],
        );
        if (!hasCard.length) {
          await insertPartCardMessage(pool, existing[0].id, buyerId, normalizedPartId);
        }
      }
      return res.json({ data: keysToCamel(existing[0]) });
    }

    const { rows } = await pool.query(
      `INSERT INTO conversations (buyer_id, technician_id, part_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [buyerId, technicianId, normalizedPartId],
    );
    if (normalizedPartId) {
      await insertPartCardMessage(pool, rows[0].id, buyerId, normalizedPartId);
    }
    res.status(201).json({ data: keysToCamel(rows[0]) });
  } catch (e) {
    next(e);
  }
});

router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(cnt), 0)::int AS total FROM (
         SELECT COUNT(*) AS cnt
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         LEFT JOIN dealers d ON d.id = c.dealer_id
         LEFT JOIN technicians t ON t.id = c.technician_id
         WHERE m.sender_id != $1
           AND m.is_read = false
           AND (c.buyer_id = $1 OR d.user_id = $1 OR t.user_id = $1)
       ) sub`,
      [userId],
    );

    res.json({ data: { count: rows[0].total } });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const pool = getPool();
    const userId = req.user.id;
    const conversationId = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before || null;

    const { rows: convRows } = await pool.query(
      `SELECT c.*,
              d.user_id AS dealer_user_id,
              t.user_id AS technician_user_id
       FROM conversations c
       LEFT JOIN dealers d ON d.id = c.dealer_id
       LEFT JOIN technicians t ON t.id = c.technician_id
       WHERE c.id = $1 AND (c.buyer_id = $2 OR d.user_id = $2 OR t.user_id = $2)`,
      [conversationId, userId],
    );
    if (!convRows.length) throw new HttpError(404, 'NOT_FOUND', 'Conversation not found');

    let query;
    let params;
    if (before) {
      query = `SELECT * FROM messages
               WHERE conversation_id = $1 AND created_at < $2
               ORDER BY created_at DESC LIMIT $3`;
      params = [conversationId, before, limit];
    } else {
      query = `SELECT * FROM messages
               WHERE conversation_id = $1
               ORDER BY created_at DESC LIMIT $2`;
      params = [conversationId, limit];
    }

    const { rows } = await pool.query(query, params);
    const messages = rows.reverse().map(keysToCamel);

    const messageIds = messages.map((m) => m.id);

    let reactionsMap = {};
    if (messageIds.length) {
      const { rows: reactionRows } = await pool.query(
        `SELECT message_id, emoji, COUNT(*)::int AS count,
                array_agg(user_id) AS user_ids
         FROM message_reactions
         WHERE message_id = ANY($1)
         GROUP BY message_id, emoji
         ORDER BY MIN(created_at)`,
        [messageIds],
      );
      for (const r of reactionRows) {
        const mid = r.message_id;
        if (!reactionsMap[mid]) reactionsMap[mid] = [];
        reactionsMap[mid].push({
          emoji: r.emoji,
          count: r.count,
          userIds: r.user_ids,
        });
      }
    }

    const replyToIds = messages.map((m) => m.replyToId).filter(Boolean);
    let replyToMap = {};
    if (replyToIds.length) {
      const { rows: replyRows } = await pool.query(
        `SELECT m.id, m.body, m.attachment_type, u.full_name AS sender_name
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE m.id = ANY($1)`,
        [replyToIds],
      );
      for (const r of replyRows) {
        replyToMap[r.id] = keysToCamel(r);
      }
    }

    const enriched = messages.map((m) => ({
      ...m,
      reactions: reactionsMap[m.id] || [],
      replyTo: m.replyToId ? (replyToMap[m.replyToId] || null) : null,
    }));

    await pool.query(
      `UPDATE messages SET is_read = true
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [conversationId, userId],
    );

    res.json({ data: enriched });
  } catch (e) {
    next(e);
  }
});

export default router;
