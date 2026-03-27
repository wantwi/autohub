-- ─── Update users.role CHECK to allow 'technician' ───────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('buyer', 'dealer', 'admin', 'technician'));

-- ─── Technicians table ───────────────────────────────────────────────────────
CREATE TABLE technicians (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id),
  display_name         VARCHAR(255) NOT NULL,
  phone_business       VARCHAR(30),
  specializations      TEXT[] NOT NULL DEFAULT '{}',
  description          TEXT,
  location_text        VARCHAR(500),
  lat                  NUMERIC,
  lng                  NUMERIC,
  service_mode         VARCHAR(20) DEFAULT 'both' CHECK (service_mode IN ('mobile','workshop','both')),
  operating_hours      JSONB,
  open_on_holidays     BOOLEAN NOT NULL DEFAULT false,
  banner_url           TEXT,
  is_verified          BOOLEAN NOT NULL DEFAULT false,
  rating_avg           NUMERIC(3,1) NOT NULL DEFAULT 0,
  rating_count         INT NOT NULL DEFAULT 0,
  onboarding_status    VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (onboarding_status IN ('pending','approved','rejected')),
  onboarding_note      TEXT,
  onboarded_by_user_id UUID REFERENCES users(id),
  onboarded_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_technicians_user ON technicians(user_id);
CREATE INDEX idx_technicians_status ON technicians(onboarding_status);

-- ─── Technician reviews ──────────────────────────────────────────────────────
CREATE TABLE technician_reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id  UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  buyer_id       UUID NOT NULL REFERENCES users(id),
  rating         INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tech_review UNIQUE (technician_id, buyer_id)
);

CREATE INDEX idx_tech_reviews_tech ON technician_reviews(technician_id);

CREATE TABLE technician_review_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID NOT NULL REFERENCES technician_reviews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE technician_review_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID NOT NULL REFERENCES technician_reviews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  reaction   VARCHAR(10) NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tech_review_reaction UNIQUE (review_id, user_id)
);

-- Rating refresh trigger
CREATE OR REPLACE FUNCTION refresh_technician_rating() RETURNS trigger AS $$
BEGIN
  UPDATE technicians SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM technician_reviews WHERE technician_id = COALESCE(NEW.technician_id, OLD.technician_id)), 0),
    rating_count = (SELECT COUNT(*) FROM technician_reviews WHERE technician_id = COALESCE(NEW.technician_id, OLD.technician_id))
  WHERE id = COALESCE(NEW.technician_id, OLD.technician_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_tech_rating
  AFTER INSERT OR UPDATE OR DELETE ON technician_reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_technician_rating();

-- ─── Service requests (booking/appointments) ────────────────────────────────
CREATE TABLE service_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES users(id),
  technician_id    UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,
  vehicle_info     TEXT,
  preferred_date   DATE,
  preferred_time   VARCHAR(50),
  service_mode     VARCHAR(20) CHECK (service_mode IN ('mobile','workshop')),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed','cancelled')),
  technician_note  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_requests_tech ON service_requests(technician_id);
CREATE INDEX idx_service_requests_buyer ON service_requests(buyer_id);

-- ─── Extend conversations for technician chats ──────────────────────────────
ALTER TABLE conversations ALTER COLUMN dealer_id DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN technician_id UUID REFERENCES technicians(id) ON DELETE CASCADE;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS uq_conversation_buyer_dealer_part;
ALTER TABLE conversations ADD CONSTRAINT chk_conversation_target
  CHECK (dealer_id IS NOT NULL OR technician_id IS NOT NULL);

CREATE INDEX idx_conversations_technician ON conversations(technician_id);
