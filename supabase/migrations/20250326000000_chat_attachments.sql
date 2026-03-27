-- ---------------------------------------------------------------------------
-- Chat attachments: images, videos, voice notes, documents
-- ---------------------------------------------------------------------------

ALTER TABLE messages ADD COLUMN attachment_url TEXT;
ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(20)
  CHECK (attachment_type IN ('image', 'video', 'audio', 'document'));
