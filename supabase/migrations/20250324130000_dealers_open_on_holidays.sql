-- Whether the shop serves customers on public holidays (dealer-declared).
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS open_on_holidays BOOLEAN NOT NULL DEFAULT false;
