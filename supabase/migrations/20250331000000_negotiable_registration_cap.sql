-- Add negotiable flag to parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT false;

-- Add listing limit for dealers (free tier = 5)
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS listing_limit INT DEFAULT 5;
