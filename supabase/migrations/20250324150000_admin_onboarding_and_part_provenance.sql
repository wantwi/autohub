ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dealers_onboarding_status_check'
  ) THEN
    ALTER TABLE dealers
      ADD CONSTRAINT dealers_onboarding_status_check
      CHECK (onboarding_status IN ('pending','approved','rejected'));
  END IF;
END $$;

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS onboarding_note TEXT,
  ADD COLUMN IF NOT EXISTS onboarded_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_by_role TEXT;

