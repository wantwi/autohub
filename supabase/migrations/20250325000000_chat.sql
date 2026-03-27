-- ---------------------------------------------------------------------------
-- In-platform chat: conversations & messages
-- ---------------------------------------------------------------------------

CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    UUID NOT NULL REFERENCES users(id),
  dealer_id   UUID NOT NULL REFERENCES dealers(id),
  part_id     UUID REFERENCES parts(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_conversation_buyer_dealer_part UNIQUE (buyer_id, dealer_id, part_id)
);

CREATE INDEX idx_conversations_buyer  ON conversations(buyer_id);
CREATE INDEX idx_conversations_dealer ON conversations(dealer_id);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = false;
