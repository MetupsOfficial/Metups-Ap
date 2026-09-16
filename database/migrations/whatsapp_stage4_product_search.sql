-- ============================================================
-- WhatsApp Stage 4: shared Metups product search support
-- Safe to run after whatsapp_message_intake.sql.
-- This reuses products and profiles; it creates no parallel listing schema.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The website and WhatsApp search both treat an active, unsold product as
-- discoverable. Normalize legacy nulls before making that contract explicit.
UPDATE products
SET is_active = COALESCE(is_active, true),
    sold = COALESCE(sold, false)
WHERE is_active IS NULL OR sold IS NULL;

ALTER TABLE products
  ALTER COLUMN is_active SET DEFAULT true,
  ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN sold SET DEFAULT false,
  ALTER COLUMN sold SET NOT NULL;

-- Common Stage 4 filters: active listing, unsold, optional category/location,
-- price ceiling, then newest first. The partial index stays small as sold or
-- inactive listings do not participate in discovery.
CREATE INDEX IF NOT EXISTS idx_products_active_search_filters
  ON products (category, location, price, created_at DESC)
  WHERE is_active = true AND sold = false;

-- Case-insensitive title and description matches used by Search V1. Queries
-- should use lower(title) / lower(description) to take advantage of these.
CREATE INDEX IF NOT EXISTS idx_products_active_title_trgm
  ON products USING gin (lower(title) gin_trgm_ops)
  WHERE is_active = true AND sold = false;

CREATE INDEX IF NOT EXISTS idx_products_active_description_trgm
  ON products USING gin (lower(coalesce(description, '')) gin_trgm_ops)
  WHERE is_active = true AND sold = false;

-- Stage 4 records a compact search event after a shared-table search executes.
ALTER TABLE whatsapp_events DROP CONSTRAINT IF EXISTS whatsapp_events_event_type_check;
ALTER TABLE whatsapp_events
  ADD CONSTRAINT whatsapp_events_event_type_check
  CHECK (event_type IN ('message_received', 'intent_classified', 'search_run', 'error'));
