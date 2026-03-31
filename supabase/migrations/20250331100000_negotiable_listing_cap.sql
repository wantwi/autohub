-- Negotiable parts and dealer listing limits
ALTER TABLE parts ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS listing_limit INT NOT NULL DEFAULT 5;

-- Messages may store JSON payload (offers, part cards); ensure column exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS payload JSONB;
