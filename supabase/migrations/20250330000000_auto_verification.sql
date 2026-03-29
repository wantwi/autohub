-- Add verified_at to technicians (dealers already have it)
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
