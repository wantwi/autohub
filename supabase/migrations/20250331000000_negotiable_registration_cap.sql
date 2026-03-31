-- Add is_negotiable flag to parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN NOT NULL DEFAULT false;

-- Add listing_limit to dealers (default 5 for unverified, NULL = unlimited for verified/upgraded)
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS listing_limit INT NOT NULL DEFAULT 5;
