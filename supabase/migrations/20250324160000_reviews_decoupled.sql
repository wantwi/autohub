-- ---------------------------------------------------------------------------
-- Decouple reviews from orders & add replies + reactions
-- ---------------------------------------------------------------------------

-- 1. Make order_id nullable so reviews can exist without an order
ALTER TABLE reviews ALTER COLUMN order_id DROP NOT NULL;

-- 2. Drop the old unique constraint on order_id (one review per order)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_order_id_key;

-- 3. Add unique constraint: one review per buyer per dealer
ALTER TABLE reviews ADD CONSTRAINT uq_reviews_dealer_buyer UNIQUE (dealer_id, buyer_id);

-- 4. Review replies (dealer responds to a review)
CREATE TABLE review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_reply_per_review_user UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_replies_review ON review_replies(review_id);

-- 5. Review reactions (like / dislike)
CREATE TABLE review_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  reaction VARCHAR(10) NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_reaction_per_review_user UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_reactions_review ON review_reactions(review_id);

-- 6. Update the rating refresh trigger to also fire on UPDATE and DELETE
DROP TRIGGER IF EXISTS tr_reviews_dealer_rating ON reviews;

CREATE OR REPLACE FUNCTION refresh_dealer_rating() RETURNS trigger AS $$
BEGIN
  UPDATE dealers d
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.dealer_id = COALESCE(NEW.dealer_id, OLD.dealer_id)
    ), 0),
    rating_count = (SELECT COUNT(*)::int FROM reviews r WHERE r.dealer_id = COALESCE(NEW.dealer_id, OLD.dealer_id))
  WHERE d.id = COALESCE(NEW.dealer_id, OLD.dealer_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reviews_dealer_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_dealer_rating();
