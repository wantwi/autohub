-- Make dealer_id nullable to support admin support conversations
ALTER TABLE conversations ALTER COLUMN dealer_id DROP NOT NULL;

-- Add optional admin_id for direct support conversations with admin
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES users(id);
