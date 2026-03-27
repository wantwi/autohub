-- AutoHub pilot schema (PRD §4 + order_status_history + otp_codes + revoked_tokens)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20),
  email VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'dealer', 'admin')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  google_sub VARCHAR(255) UNIQUE,
  CONSTRAINT users_contact_chk CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year SMALLINT NOT NULL,
  vin VARCHAR(50) UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vehicles_user ON vehicles(user_id);

CREATE TABLE dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_name VARCHAR(255) NOT NULL,
  description TEXT,
  phone_business VARCHAR(20) NOT NULL,
  location_text TEXT NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  rating_avg DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  operating_hours JSONB,
  banner_url TEXT,
  open_on_holidays BOOLEAN NOT NULL DEFAULT false,
  onboarding_status TEXT NOT NULL DEFAULT 'approved' CHECK (onboarding_status IN ('pending','approved','rejected')),
  onboarding_note TEXT,
  onboarded_by_user_id UUID REFERENCES users(id),
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_dealers_verified ON dealers(is_verified) WHERE is_verified = true;

CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'used', 'refurbished')),
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  compatible_makes TEXT[] DEFAULT '{}',
  compatible_models TEXT[] DEFAULT '{}',
  compatible_years INT4RANGE,
  images TEXT[] DEFAULT '{}',
  part_number VARCHAR(100),
  created_by_user_id UUID REFERENCES users(id),
  created_by_role TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_parts_dealer ON parts(dealer_id);
CREATE INDEX idx_parts_list ON parts(is_available, condition, category);
CREATE INDEX idx_parts_name_trgm ON parts USING gin (name gin_trgm_ops);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(20) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id),
  dealer_id UUID NOT NULL REFERENCES dealers(id),
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'dispatched', 'delivered', 'completed', 'cancelled')
  ),
  paystack_ref VARCHAR(100),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  confirm_deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_dealer ON orders(dealer_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_history_order ON order_status_history(order_id);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id),
  dealer_id UUID NOT NULL REFERENCES dealers(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_dealer ON reviews(dealer_id);

CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone, expires_at DESC);

CREATE TABLE revoked_tokens (
  jti UUID PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_revoked_exp ON revoked_tokens(expires_at);

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tr_parts_updated BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dealer aggregates on review insert/update (pilot: insert only)
CREATE OR REPLACE FUNCTION refresh_dealer_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dealers d
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.dealer_id = NEW.dealer_id
    ), 0),
    rating_count = (SELECT COUNT(*)::int FROM reviews r WHERE r.dealer_id = NEW.dealer_id)
  WHERE d.id = NEW.dealer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reviews_dealer_rating AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_dealer_rating();
