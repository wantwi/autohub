-- Allow messages without text body (e.g. voice notes, images without captions)
ALTER TABLE messages ALTER COLUMN body DROP NOT NULL;
