-- METUPS CONTROL CENTER (MCC) FOUNDATION
-- Apply after supabase/admin_setup.sql. This is additive: no existing
-- marketplace or admin dashboard table is changed or removed.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Every MCC record is owned by an existing MCC administrator. The standard
-- audit columns are included on every new operating-system table.
CREATE TABLE IF NOT EXISTS mcc_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL CHECK (department IN ('customer_success','growth','intelligence','knowledge','roadmap','trust_safety')),
  module text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text DEFAULT 'normal',
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS mcc_work_items_department_idx ON mcc_work_items (department, module, status);
CREATE INDEX IF NOT EXISTS mcc_work_items_search_idx ON mcc_work_items USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'')));

CREATE TABLE IF NOT EXISTS mcc_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, color text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL, updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS mcc_work_item_tags (
  work_item_id uuid NOT NULL REFERENCES mcc_work_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES mcc_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (work_item_id, tag_id)
);
CREATE TABLE IF NOT EXISTS mcc_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), work_item_id uuid NOT NULL REFERENCES mcc_work_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL, file_name text NOT NULL, content_type text, byte_size bigint,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL, updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mcc_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), decision text NOT NULL, problem text NOT NULL,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb, rationale text, expected_outcome text,
  actual_outcome text, lessons_learned text, decision_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL, updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS mcc_roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, business_value text,
  priority text DEFAULT 'medium', complexity text, dependencies text, status text NOT NULL DEFAULT 'idea',
  target_release text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL, updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Intelligence modules deliberately have independent tables. This keeps the
-- data model queryable and extensible without turning company knowledge into
-- one unbounded catch-all table. They share the standard MCC audit shape.
CREATE TABLE IF NOT EXISTS mcc_customer_interviews (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_competitor_intelligence (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_marketplace_observations (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_growth_experiments (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_campaign_reviews (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_success_stories (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_failed_transactions (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_feature_requests (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
CREATE TABLE IF NOT EXISTS mcc_bug_reports (LIKE mcc_work_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS);

CREATE OR REPLACE FUNCTION mcc_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION mcc_apply_updated_at() RETURNS void LANGUAGE plpgsql AS $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mcc_work_items','mcc_tags','mcc_attachments','mcc_decisions','mcc_roadmap_items','mcc_customer_interviews','mcc_competitor_intelligence','mcc_marketplace_observations','mcc_growth_experiments','mcc_campaign_reviews','mcc_success_stories','mcc_failed_transactions','mcc_feature_requests','mcc_bug_reports'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'mcc_' || t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION mcc_set_updated_at()', 'mcc_' || t || '_updated_at', t);
  END LOOP;
END; $$;
SELECT mcc_apply_updated_at();
DROP FUNCTION mcc_apply_updated_at();

-- New MCC data remains private. Expose it through authenticated admin RPCs
-- after the relevant module UI is enabled.
ALTER TABLE mcc_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_work_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_customer_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_competitor_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_marketplace_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_growth_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_campaign_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_failed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcc_bug_reports ENABLE ROW LEVEL SECURITY;
