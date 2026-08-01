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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mcc-attachments', 'mcc-attachments', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

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

-- ── Department-level MCC privileges ─────────────────────────────
-- Super Admins (admin_users.role = 0) always retain full access. Every other
-- admin must have an explicit department grant for the action being taken.
CREATE TABLE IF NOT EXISTS mcc_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  department text NOT NULL CHECK (department IN ('executive','marketplace','people','customer_success','growth','intelligence','knowledge','decisions','roadmap','trust_safety','finance','ai')),
  can_read boolean NOT NULL DEFAULT true, can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false, can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL, updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  UNIQUE (admin_id, department)
);
ALTER TABLE mcc_admin_permissions ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS mcc_admin_permissions_updated_at ON mcc_admin_permissions;
CREATE TRIGGER mcc_admin_permissions_updated_at BEFORE UPDATE ON mcc_admin_permissions FOR EACH ROW EXECUTE FUNCTION mcc_set_updated_at();

CREATE OR REPLACE FUNCTION mcc_can_access(p_token text, p_department text, p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF v_admin.admin_id IS NULL THEN RETURN false; END IF;
  IF v_admin.admin_role = 0 THEN RETURN true; END IF;
  RETURN EXISTS (SELECT 1 FROM mcc_admin_permissions p WHERE p.admin_id = v_admin.admin_id AND p.department = p_department
    AND CASE p_action WHEN 'read' THEN p.can_read WHEN 'create' THEN p.can_create WHEN 'update' THEN p.can_update WHEN 'delete' THEN p.can_delete ELSE false END);
END; $$;

CREATE OR REPLACE FUNCTION mcc_can_work_item_access(p_token text, p_work_item_id uuid, p_action text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT mcc_can_access(p_token, w.department, p_action) FROM mcc_work_items w WHERE w.id = p_work_item_id
$$;

CREATE OR REPLACE FUNCTION mcc_get_my_permissions(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF v_admin.admin_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF v_admin.admin_role = 0 THEN RETURN jsonb_build_object('ok', true, 'super_admin', true, 'permissions', '[]'::jsonb); END IF;
  RETURN jsonb_build_object('ok', true, 'super_admin', false, 'permissions', coalesce((SELECT jsonb_agg(jsonb_build_object('department',department,'read',can_read,'create',can_create,'update',can_update,'delete',can_delete)) FROM mcc_admin_permissions WHERE admin_id=v_admin.admin_id), '[]'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION mcc_manage_admin_permissions(p_token text, p_admin_id uuid, p_permissions jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_permission jsonb; v_department text;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF v_admin.admin_id IS NULL OR v_admin.admin_role <> 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Only a Super Admin can assign MCC access'); END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id=p_admin_id AND is_active=true) THEN RETURN jsonb_build_object('ok', false, 'error', 'Admin account not found'); END IF;
  DELETE FROM mcc_admin_permissions WHERE admin_id=p_admin_id;
  FOR v_permission IN SELECT * FROM jsonb_array_elements(coalesce(p_permissions,'[]'::jsonb)) LOOP
    v_department := v_permission->>'department';
    IF v_department IN ('executive','marketplace','people','customer_success','growth','intelligence','knowledge','decisions','roadmap','trust_safety','finance','ai') AND coalesce((v_permission->>'read')::boolean,false) THEN
      INSERT INTO mcc_admin_permissions (admin_id,department,can_read,can_create,can_update,can_delete,created_by,updated_by)
      VALUES (p_admin_id,v_department,true,coalesce((v_permission->>'create')::boolean,false),coalesce((v_permission->>'update')::boolean,false),coalesce((v_permission->>'delete')::boolean,false),v_admin.admin_id,v_admin.admin_id);
    END IF;
  END LOOP;
  INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (v_admin.admin_id,'mcc_assign_permissions','admin',p_admin_id::text,jsonb_build_object('permissions',p_permissions));
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION mcc_get_admin_permissions(p_token text, p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF v_admin.admin_id IS NULL OR v_admin.admin_role <> 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Only a Super Admin can view MCC access'); END IF;
  RETURN jsonb_build_object('ok', true, 'permissions', coalesce((SELECT jsonb_agg(jsonb_build_object('department',department,'read',can_read,'create',can_create,'update',can_update,'delete',can_delete) ORDER BY department) FROM mcc_admin_permissions WHERE admin_id=p_admin_id), '[]'::jsonb));
END; $$;

GRANT EXECUTE ON FUNCTION mcc_can_access(text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION mcc_can_work_item_access(text,uuid,text) TO anon;
GRANT EXECUTE ON FUNCTION mcc_get_my_permissions(text) TO anon;
GRANT EXECUTE ON FUNCTION mcc_manage_admin_permissions(text,uuid,jsonb) TO anon;
GRANT EXECUTE ON FUNCTION mcc_get_admin_permissions(text,uuid) TO anon;

-- ── Decision Journal API ────────────────────────────────────────
-- These RPCs retain the existing dashboard's token-based authorization model.
CREATE OR REPLACE FUNCTION mcc_list_decisions(
  p_token text, p_search text DEFAULT '', p_page integer DEFAULT 0, p_limit integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_rows jsonb; v_total integer;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_access(p_token, 'decisions', 'read') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;
  SELECT count(*) INTO v_total FROM mcc_decisions
    WHERE p_search = '' OR decision ILIKE '%' || p_search || '%' OR problem ILIKE '%' || p_search || '%';
  SELECT coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO v_rows FROM (
    SELECT id, decision, problem, alternatives, rationale, expected_outcome, actual_outcome, lessons_learned, decision_date, created_at, updated_at
    FROM mcc_decisions
    WHERE p_search = '' OR decision ILIKE '%' || p_search || '%' OR problem ILIKE '%' || p_search || '%'
    ORDER BY decision_date DESC, created_at DESC
    LIMIT greatest(1, least(p_limit, 100)) OFFSET greatest(0, p_page) * greatest(1, least(p_limit, 100))
  ) d;
  RETURN jsonb_build_object('ok', true, 'rows', v_rows, 'total', v_total);
END; $$;

CREATE OR REPLACE FUNCTION mcc_save_decision(
  p_token text, p_id uuid DEFAULT NULL, p_decision text DEFAULT '', p_problem text DEFAULT '',
  p_alternatives jsonb DEFAULT '[]'::jsonb, p_rationale text DEFAULT NULL, p_expected_outcome text DEFAULT NULL,
  p_actual_outcome text DEFAULT NULL, p_lessons_learned text DEFAULT NULL, p_decision_date date DEFAULT current_date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_id uuid;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_access(p_token, 'decisions', CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END) THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF btrim(p_decision) = '' OR btrim(p_problem) = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'Decision and problem are required'); END IF;
  IF p_id IS NULL THEN
    INSERT INTO mcc_decisions (decision, problem, alternatives, rationale, expected_outcome, actual_outcome, lessons_learned, decision_date, created_by, updated_by)
    VALUES (btrim(p_decision), btrim(p_problem), coalesce(p_alternatives, '[]'::jsonb), p_rationale, p_expected_outcome, p_actual_outcome, p_lessons_learned, coalesce(p_decision_date, current_date), v_admin.admin_id, v_admin.admin_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE mcc_decisions SET decision = btrim(p_decision), problem = btrim(p_problem), alternatives = coalesce(p_alternatives, '[]'::jsonb), rationale = p_rationale, expected_outcome = p_expected_outcome, actual_outcome = p_actual_outcome, lessons_learned = p_lessons_learned, decision_date = coalesce(p_decision_date, current_date), updated_by = v_admin.admin_id
    WHERE id = p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Decision not found'); END IF;
  END IF;
  INSERT INTO audit_log (admin_id, action, target_type, target_id, details) VALUES (v_admin.admin_id, 'mcc_save_decision', 'mcc_decision', v_id::text, jsonb_build_object('decision', btrim(p_decision)));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END; $$;

CREATE OR REPLACE FUNCTION mcc_delete_decision(p_token text, p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_access(p_token, 'decisions', 'delete') THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  DELETE FROM mcc_decisions WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Decision not found'); END IF;
  INSERT INTO audit_log (admin_id, action, target_type, target_id) VALUES (v_admin.admin_id, 'mcc_delete_decision', 'mcc_decision', p_id::text);
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION mcc_list_decisions(text, text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION mcc_save_decision(text, uuid, text, text, jsonb, text, text, text, text, date) TO anon;
GRANT EXECUTE ON FUNCTION mcc_delete_decision(text, uuid) TO anon;

-- ── Shared MCC module API ───────────────────────────────────────
-- Customer Success, Growth, Intelligence and Knowledge use a consistent
-- record contract while retaining their own department/module classification.
CREATE OR REPLACE FUNCTION mcc_list_work_items(
  p_token text, p_department text, p_module text DEFAULT '', p_search text DEFAULT '',
  p_status text DEFAULT '', p_page integer DEFAULT 0, p_limit integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_rows jsonb; v_total integer;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_access(p_token, p_department, 'read') THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF p_department NOT IN ('customer_success','growth','intelligence','knowledge','roadmap','trust_safety') THEN RETURN jsonb_build_object('ok', false, 'error', 'Unknown MCC department'); END IF;
  SELECT count(*) INTO v_total FROM mcc_work_items
   WHERE department = p_department AND (p_module = '' OR module = p_module)
   AND (p_status = '' OR status = p_status)
   AND (p_search = '' OR title ILIKE '%' || p_search || '%' OR coalesce(summary,'') ILIKE '%' || p_search || '%');
  SELECT coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) INTO v_rows FROM (
    SELECT w.id, w.department, w.module, w.title, w.status, w.priority, w.summary, w.metadata, w.created_at, w.updated_at,
      coalesce((SELECT jsonb_agg(t.name ORDER BY t.name) FROM mcc_work_item_tags wit JOIN mcc_tags t ON t.id = wit.tag_id WHERE wit.work_item_id = w.id), '[]'::jsonb) AS tags,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.file_name, 'path', a.storage_path, 'type', a.content_type) ORDER BY a.created_at DESC) FROM mcc_attachments a WHERE a.work_item_id = w.id), '[]'::jsonb) AS attachments
    FROM mcc_work_items w WHERE department = p_department AND (p_module = '' OR module = p_module)
      AND (p_status = '' OR status = p_status)
      AND (p_search = '' OR title ILIKE '%' || p_search || '%' OR coalesce(summary,'') ILIKE '%' || p_search || '%')
    ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, updated_at DESC
    LIMIT greatest(1, least(p_limit, 100)) OFFSET greatest(0, p_page) * greatest(1, least(p_limit, 100))
  ) w;
  RETURN jsonb_build_object('ok', true, 'rows', v_rows, 'total', v_total);
END; $$;

CREATE OR REPLACE FUNCTION mcc_set_work_item_tags(p_token text, p_work_item_id uuid, p_tags text[] DEFAULT ARRAY[]::text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_tag text; v_tag_id uuid;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_work_item_access(p_token, p_work_item_id, 'update') THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF NOT EXISTS (SELECT 1 FROM mcc_work_items WHERE id = p_work_item_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Record not found'); END IF;
  DELETE FROM mcc_work_item_tags WHERE work_item_id = p_work_item_id;
  FOREACH v_tag IN ARRAY p_tags LOOP
    v_tag := left(btrim(v_tag), 48);
    IF v_tag <> '' THEN
      INSERT INTO mcc_tags (name, created_by, updated_by) VALUES (lower(v_tag), v_admin.admin_id, v_admin.admin_id)
      ON CONFLICT (name) DO UPDATE SET updated_at = now(), updated_by = v_admin.admin_id RETURNING id INTO v_tag_id;
      INSERT INTO mcc_work_item_tags (work_item_id, tag_id) VALUES (p_work_item_id, v_tag_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION mcc_add_attachment(p_token text, p_work_item_id uuid, p_storage_path text, p_file_name text, p_content_type text DEFAULT NULL, p_byte_size bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_id uuid;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_work_item_access(p_token, p_work_item_id, 'update') THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF NOT EXISTS (SELECT 1 FROM mcc_work_items WHERE id = p_work_item_id) THEN RETURN jsonb_build_object('ok', false, 'error', 'Record not found'); END IF;
  INSERT INTO mcc_attachments (work_item_id,storage_path,file_name,content_type,byte_size,created_by,updated_by)
  VALUES (p_work_item_id,p_storage_path,left(p_file_name,255),p_content_type,p_byte_size,v_admin.admin_id,v_admin.admin_id) RETURNING id INTO v_id;
  INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (v_admin.admin_id,'mcc_add_attachment','mcc_attachment',v_id::text,jsonb_build_object('work_item_id',p_work_item_id,'file_name',p_file_name));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END; $$;

CREATE OR REPLACE FUNCTION mcc_save_work_item(
  p_token text, p_id uuid DEFAULT NULL, p_department text DEFAULT '', p_module text DEFAULT '',
  p_title text DEFAULT '', p_status text DEFAULT 'open', p_priority text DEFAULT 'normal',
  p_summary text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_id uuid;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_access(p_token, p_department, CASE WHEN p_id IS NULL THEN 'create' ELSE 'update' END) THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF p_department NOT IN ('customer_success','growth','intelligence','knowledge','roadmap','trust_safety') OR btrim(p_module) = '' OR btrim(p_title) = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'Department, module and title are required'); END IF;
  IF p_status NOT IN ('open','in_progress','blocked','complete','archived') THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid status'); END IF;
  IF p_priority NOT IN ('low','normal','high','critical') THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid priority'); END IF;
  IF p_id IS NULL THEN
    INSERT INTO mcc_work_items (department,module,title,status,priority,summary,metadata,created_by,updated_by)
    VALUES (p_department,btrim(p_module),btrim(p_title),p_status,p_priority,p_summary,coalesce(p_metadata,'{}'::jsonb),v_admin.admin_id,v_admin.admin_id) RETURNING id INTO v_id;
  ELSE
    UPDATE mcc_work_items SET department=p_department,module=btrim(p_module),title=btrim(p_title),status=p_status,priority=p_priority,summary=p_summary,metadata=coalesce(p_metadata,'{}'::jsonb),updated_by=v_admin.admin_id WHERE id=p_id AND department=p_department RETURNING id INTO v_id;
    IF v_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Record not found'); END IF;
  END IF;
  INSERT INTO audit_log (admin_id,action,target_type,target_id,details) VALUES (v_admin.admin_id,'mcc_save_work_item','mcc_work_item',v_id::text,jsonb_build_object('department',p_department,'module',p_module,'title',p_title));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END; $$;

CREATE OR REPLACE FUNCTION mcc_delete_work_item(p_token text, p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT mcc_can_work_item_access(p_token, p_id, 'delete') THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  DELETE FROM mcc_work_items WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Record not found'); END IF;
  INSERT INTO audit_log (admin_id,action,target_type,target_id) VALUES (v_admin.admin_id,'mcc_delete_work_item','mcc_work_item',p_id::text);
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION mcc_list_work_items(text,text,text,text,text,integer,integer) TO anon;
GRANT EXECUTE ON FUNCTION mcc_save_work_item(text,uuid,text,text,text,text,text,text,jsonb) TO anon;
GRANT EXECUTE ON FUNCTION mcc_delete_work_item(text,uuid) TO anon;
GRANT EXECUTE ON FUNCTION mcc_set_work_item_tags(text,uuid,text[]) TO anon;
GRANT EXECUTE ON FUNCTION mcc_add_attachment(text,uuid,text,text,text,bigint) TO anon;

-- ── MCC universal search ────────────────────────────────────────
CREATE OR REPLACE FUNCTION mcc_universal_search(p_token text, p_query text, p_limit integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin record; v_rows jsonb;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF v_admin.admin_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;
  IF length(btrim(p_query)) < 2 THEN RETURN jsonb_build_object('ok', true, 'rows', '[]'::jsonb); END IF;
  SELECT coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) INTO v_rows FROM (
    SELECT id, 'record'::text AS kind, department, module, title, summary, updated_at
    FROM mcc_work_items WHERE (title ILIKE '%' || p_query || '%' OR coalesce(summary,'') ILIKE '%' || p_query || '%')
      AND (v_admin.admin_role = 0 OR EXISTS (SELECT 1 FROM mcc_admin_permissions p WHERE p.admin_id=v_admin.admin_id AND p.department=mcc_work_items.department AND p.can_read))
    UNION ALL
    SELECT id, 'decision'::text, 'decisions', 'Decision Journal', decision, problem, updated_at
    FROM mcc_decisions WHERE (decision ILIKE '%' || p_query || '%' OR problem ILIKE '%' || p_query || '%')
      AND (v_admin.admin_role = 0 OR EXISTS (SELECT 1 FROM mcc_admin_permissions p WHERE p.admin_id=v_admin.admin_id AND p.department='decisions' AND p.can_read))
    ORDER BY updated_at DESC LIMIT greatest(1, least(p_limit, 30))
  ) s;
  RETURN jsonb_build_object('ok', true, 'rows', v_rows);
END; $$;
GRANT EXECUTE ON FUNCTION mcc_universal_search(text,text,integer) TO anon;
