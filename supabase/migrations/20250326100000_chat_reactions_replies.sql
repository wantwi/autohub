-- ---------------------------------------------------------------------------
-- Message reactions & reply-to support
-- ---------------------------------------------------------------------------

CREATE TABLE message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  emoji       VARCHAR(10) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_reaction_user_message UNIQUE (message_id, user_id)
);

CREATE INDEX idx_msg_reactions_message ON message_reactions(message_id);

ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
