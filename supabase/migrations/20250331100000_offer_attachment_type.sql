-- Add 'offer' and 'location' to the messages attachment_type CHECK constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_attachment_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_attachment_type_check
  CHECK (attachment_type IN ('image', 'video', 'audio', 'document', 'part_card', 'offer', 'location'));
