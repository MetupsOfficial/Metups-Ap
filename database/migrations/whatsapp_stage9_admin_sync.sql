-- WhatsApp Stage 9A: internal source traceability in the existing marketplace.
-- The source is analytics/audit metadata only; listings and moderation retain
-- the same products and flags workflows used by the website.

ALTER TABLE products ADD COLUMN IF NOT EXISTS source text;

UPDATE products
SET source = 'website'
WHERE source IS NULL;

ALTER TABLE products
  ALTER COLUMN source SET DEFAULT 'website',
  ALTER COLUMN source SET NOT NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_check;
ALTER TABLE products
  ADD CONSTRAINT products_source_check
  CHECK (source IN ('website', 'whatsapp'));

CREATE INDEX IF NOT EXISTS idx_products_source_created_at
  ON products (source, created_at DESC);

-- Supports the existing audit log while keeping WhatsApp operational events
-- separate from admin actions. `admin_id` is intentionally null for bot events.
CREATE INDEX IF NOT EXISTS idx_audit_log_action_created_at
  ON audit_log (action, created_at DESC);
