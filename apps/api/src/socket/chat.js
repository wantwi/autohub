import { getPool } from '../db/pool.js';
import { keysToCamel } from '../lib/format.js';
import { sendPushToUser } from '../services/pushNotify.js';

const VALID_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

async function getConversationParticipants(pool, conversationId) {
  const { rows: convRows } = await pool.query(
    'SELECT buyer_id, dealer_id, technician_id FROM conversations WHERE id = $1',
    [conversationId],
  );
  if (!convRows.length) return null;
  const conv = convRows[0];

  let dealerUserId = null;
  if (conv.dealer_id) {
    const { rows } = await pool.query('SELECT user_id FROM dealers WHERE id = $1', [conv.dealer_id]);
    dealerUserId = rows[0]?.user_id ?? null;
  }

  let technicianUserId = null;
  if (conv.technician_id) {
    const { rows } = await pool.query('SELECT user_id FROM technicians WHERE id = $1', [conv.technician_id]);
    technicianUserId = rows[0]?.user_id ?? null;
  }

  return {
    buyerId: conv.buyer_id,
    dealerUserId,
    technicianUserId,
    participants: [conv.buyer_id, dealerUserId, technicianUserId].filter(Boolean),
  };
}

async function getAggregatedReactions(pool, messageId) {
  const { rows } = await pool.query(
    `SELECT emoji, COUNT(*)::int AS count,
            array_agg(user_id) AS user_ids
     FROM message_reactions
     WHERE message_id = $1
     GROUP BY emoji
     ORDER BY MIN(created_at)`,
    [messageId],
  );
  return rows.map((r) => ({
    emoji: r.emoji,
    count: r.count,
    userIds: r.user_ids,
  }));
}

export function registerChatHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    socket.on('send_message', async ({ conversationId, body, attachmentUrl, attachmentType, replyToId }, ack) => {
      const hasText = body?.trim();
      const hasAttachment = attachmentUrl && attachmentType;
      if (!conversationId || (!hasText && !hasAttachment)) {
        return ack?.({ error: 'conversationId and (body or attachment) are required' });
      }

      const VALID_TYPES = ['image', 'video', 'audio', 'document'];
      if (hasAttachment && !VALID_TYPES.includes(attachmentType)) {
        return ack?.({ error: 'Invalid attachmentType' });
      }

      const pool = getPool();

      try {
        const convInfo = await getConversationParticipants(pool, conversationId);
        if (!convInfo) return ack?.({ error: 'Conversation not found' });
        if (!convInfo.participants.includes(userId)) {
          return ack?.({ error: 'Not a participant' });
        }

        let validReplyToId = null;
        if (replyToId) {
          const { rows: replyRows } = await pool.query(
            'SELECT id FROM messages WHERE id = $1 AND conversation_id = $2',
            [replyToId, conversationId],
          );
          if (replyRows.length) validReplyToId = replyToId;
        }

        const { rows } = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, body, attachment_url, attachment_type, reply_to_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [conversationId, userId, hasText ? body.trim() : null, hasAttachment ? attachmentUrl : null, hasAttachment ? attachmentType : null, validReplyToId],
        );
        const msg = keysToCamel(rows[0]);

        if (validReplyToId) {
          const { rows: replyRows } = await pool.query(
            `SELECT m.id, m.body, m.attachment_type, u.full_name AS sender_name
             FROM messages m JOIN users u ON u.id = m.sender_id
             WHERE m.id = $1`,
            [validReplyToId],
          );
          if (replyRows.length) {
            msg.replyTo = keysToCamel(replyRows[0]);
          }
        }

        await pool.query(
          'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
          [msg.createdAt, conversationId],
        );

        for (const pid of convInfo.participants) {
          io.to(`user:${pid}`).emit('new_message', msg);
        }
        ack?.({ data: msg });

        const senderName = await pool
          .query('SELECT full_name FROM users WHERE id = $1', [userId])
          .then((r) => r.rows[0]?.full_name || 'Someone');
        const preview = hasText ? body.trim().slice(0, 80) : `Sent ${attachmentType || 'a file'}`;

        for (const pid of convInfo.participants) {
          if (pid === userId) continue;
          sendPushToUser(pid, {
            title: senderName,
            body: preview,
            url: `/messages/${conversationId}`,
          }).catch(() => {});
        }
      } catch (err) {
        console.error('send_message error:', err);
        ack?.({ error: 'Server error' });
      }
    });

    socket.on('react_message', async ({ messageId, emoji }, ack) => {
      if (!messageId || !emoji) {
        return ack?.({ error: 'messageId and emoji are required' });
      }
      if (!VALID_EMOJIS.includes(emoji)) {
        return ack?.({ error: 'Invalid emoji' });
      }

      const pool = getPool();

      try {
        const { rows: msgRows } = await pool.query(
          'SELECT conversation_id FROM messages WHERE id = $1',
          [messageId],
        );
        if (!msgRows.length) return ack?.({ error: 'Message not found' });
        const conversationId = msgRows[0].conversation_id;

        const convInfo = await getConversationParticipants(pool, conversationId);
        if (!convInfo || !convInfo.participants.includes(userId)) {
          return ack?.({ error: 'Not a participant' });
        }

        const { rows: existing } = await pool.query(
          'SELECT emoji FROM message_reactions WHERE message_id = $1 AND user_id = $2',
          [messageId, userId],
        );

        if (existing.length && existing[0].emoji === emoji) {
          await pool.query(
            'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2',
            [messageId, userId],
          );
        } else if (existing.length) {
          await pool.query(
            'UPDATE message_reactions SET emoji = $1 WHERE message_id = $2 AND user_id = $3',
            [emoji, messageId, userId],
          );
        } else {
          await pool.query(
            'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
            [messageId, userId, emoji],
          );
        }

        const reactions = await getAggregatedReactions(pool, messageId);

        for (const pid of convInfo.participants) {
          io.to(`user:${pid}`).emit('message_reaction', { messageId, reactions });
        }
        ack?.({ data: { messageId, reactions } });
      } catch (err) {
        console.error('react_message error:', err);
        ack?.({ error: 'Server error' });
      }
    });

    socket.on('remove_reaction', async ({ messageId }, ack) => {
      if (!messageId) return ack?.({ error: 'messageId is required' });

      const pool = getPool();

      try {
        const { rows: msgRows } = await pool.query(
          'SELECT conversation_id FROM messages WHERE id = $1',
          [messageId],
        );
        if (!msgRows.length) return ack?.({ error: 'Message not found' });
        const conversationId = msgRows[0].conversation_id;

        const convInfo = await getConversationParticipants(pool, conversationId);
        if (!convInfo || !convInfo.participants.includes(userId)) {
          return ack?.({ error: 'Not a participant' });
        }

        await pool.query(
          'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2',
          [messageId, userId],
        );

        const reactions = await getAggregatedReactions(pool, messageId);

        for (const pid of convInfo.participants) {
          io.to(`user:${pid}`).emit('message_reaction', { messageId, reactions });
        }
        ack?.({ data: { messageId, reactions } });
      } catch (err) {
        console.error('remove_reaction error:', err);
        ack?.({ error: 'Server error' });
      }
    });

    socket.on('mark_read', async ({ conversationId }, ack) => {
      if (!conversationId) return ack?.({ error: 'conversationId required' });

      const pool = getPool();
      try {
        const { rowCount } = await pool.query(
          `UPDATE messages SET is_read = true
           WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
          [conversationId, userId],
        );

        const convInfo = await getConversationParticipants(pool, conversationId);
        if (convInfo) {
          for (const pid of convInfo.participants) {
            io.to(`user:${pid}`).emit('messages_read', { conversationId, readBy: userId });
          }
        }

        ack?.({ data: { updated: rowCount } });
      } catch (err) {
        console.error('mark_read error:', err);
        ack?.({ error: 'Server error' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId,
      });
    });

    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });
  });
}
