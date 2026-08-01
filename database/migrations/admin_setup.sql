-- ================================================================
-- METUPS ADMIN BACKEND + REPORT (FLAGS) SYSTEM
-- supabase/admin_setup.sql
--
-- Run once in Supabase SQL Editor (safe to re-run — all idempotent).
-- After running, uncomment the SEED block at the bottom to create
-- your first Super Admin account.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- TABLES
-- ================================================================

-- Admin accounts — independent of auth.users, password-based
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  password_hash text        NOT NULL,
  role          smallint    NOT NULL DEFAULT 1,
  -- 0 = Super Admin  (full access, can manage other admins)
  -- 1 = Admin        (all moderation + listings + users)
  -- 2 = Moderator    (flags + listings only)
  -- 3 = Analyst      (read-only analytics)
  is_active     boolean     NOT NULL DEFAULT true,
  last_login    timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Session tokens — issued on login, expire after 8 hours
CREATE TABLE IF NOT EXISTS admin_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid        NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Immutable audit log — every admin action is appended here
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        REFERENCES admin_users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  target_type text,
  target_id   text,
  details     jsonb       DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

-- User-submitted flags on product listings
CREATE TABLE IF NOT EXISTS flags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reporter_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reason      text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'removed')),
  resolved_by uuid        REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  -- One flag per user per listing (prevents abuse)
  UNIQUE (product_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS flags_status_idx  ON flags(status);
CREATE INDEX IF NOT EXISTS flags_product_idx ON flags(product_id);

-- Expire old admin tokens automatically (optional cleanup index)
CREATE INDEX IF NOT EXISTS admin_tokens_expires_idx ON admin_tokens(expires_at);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

-- Admin tables: no direct client access; all reads/writes via SECURITY DEFINER RPCs
ALTER TABLE admin_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log    ENABLE ROW LEVEL SECURITY;

-- Flags: authenticated users may insert their own flag only; no client SELECT
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flags_insert_auth" ON flags;
CREATE POLICY "flags_insert_auth" ON flags
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- ================================================================
-- INTERNAL HELPER — used by every admin RPC to authenticate
-- Returns one row if the token is valid; zero rows otherwise.
-- ================================================================
CREATE OR REPLACE FUNCTION _admin_check_token(p_token text)
RETURNS TABLE (admin_id uuid, admin_role smallint, admin_name text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT au.id, au.role, au.name
  FROM   admin_tokens t
  JOIN   admin_users  au ON au.id = t.admin_id
  WHERE  t.token      = p_token
    AND  t.expires_at > now()
    AND  au.is_active  = true;
$$;

-- ================================================================
-- AUTH RPCs
-- ================================================================

CREATE OR REPLACE FUNCTION admin_login(
  p_email    text,
  p_password text,
  p_ip       text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_admin
  FROM   admin_users
  WHERE  email     = lower(trim(p_email))
    AND  is_active = true;

  IF NOT FOUND
     OR v_admin.password_hash <> crypt(p_password, v_admin.password_hash)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email or password');
  END IF;

  INSERT INTO admin_tokens (admin_id, ip_address)
  VALUES (v_admin.id, p_ip)
  RETURNING token INTO v_token;

  UPDATE admin_users SET last_login = now() WHERE id = v_admin.id;

  INSERT INTO audit_log (admin_id, action, ip_address)
  VALUES (v_admin.id, 'login', p_ip);

  RETURN jsonb_build_object(
    'ok',    true,
    'token', v_token,
    'admin', jsonb_build_object(
      'id',    v_admin.id,
      'name',  v_admin.name,
      'role',  v_admin.role,
      'email', v_admin.email
    )
  );
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_verify(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_adm record;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired session');
  END IF;
  RETURN jsonb_build_object(
    'ok',    true,
    'admin', jsonb_build_object(
      'id',   v_adm.admin_id,
      'name', v_adm.admin_name,
      'role', v_adm.admin_role
    )
  );
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_logout(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_adm record;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  DELETE FROM admin_tokens WHERE token = p_token;
  IF FOUND THEN
    INSERT INTO audit_log (admin_id, action) VALUES (v_adm.admin_id, 'logout');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ================================================================
-- DATA RPCs
-- ================================================================

CREATE OR REPLACE FUNCTION admin_get_analytics(
  p_token text,
  p_days  int DEFAULT 30
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm          record;
  v_kpis         jsonb;
  v_growth       jsonb;
  v_by_category  jsonb;
  v_by_city      jsonb;
  v_funnel       jsonb;
  v_top          jsonb;
  v_period_start timestamptz := now() - (p_days || ' days')::interval;
  v_prev_start   timestamptz := now() - (p_days * 2 || ' days')::interval;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  -- ── KPIs ────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'total_users',          (SELECT COUNT(*) FROM profiles),
    'active_listings',      (SELECT COUNT(*) FROM products WHERE is_active AND NOT sold),
    'total_messages',       (SELECT COUNT(*) FROM messages),
    'items_sold',           (SELECT COUNT(*) FROM products WHERE sold),
    'week_signups',         (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - interval '7 days'),
    'conversion_rate',      ROUND(
                              COALESCE(
                                (SELECT COUNT(*) FROM products WHERE sold)::numeric /
                                NULLIF((SELECT COUNT(*) FROM products), 0) * 100,
                              0), 1),
    'total_sold_value',     COALESCE((SELECT SUM(price) FROM products WHERE sold), 0),
    'pending_flags',        (SELECT COUNT(*) FROM flags WHERE status = 'pending'),
    'new_users_period',     (SELECT COUNT(*) FROM profiles WHERE created_at >= v_period_start),
    'prev_users_period',    (SELECT COUNT(*) FROM profiles
                              WHERE created_at >= v_prev_start AND created_at < v_period_start),
    'new_listings_period',  (SELECT COUNT(*) FROM products WHERE created_at >= v_period_start),
    'prev_listings_period', (SELECT COUNT(*) FROM products
                              WHERE created_at >= v_prev_start AND created_at < v_period_start)
  ) INTO v_kpis;

  -- ── Daily growth series ─────────────────────────────────────────
  SELECT jsonb_agg(
    jsonb_build_object(
      'day',      to_char(d.day, 'YYYY-MM-DD'),
      'users',    COALESCE(u.cnt, 0),
      'listings', COALESCE(l.cnt, 0),
      'messages', COALESCE(m.cnt, 0)
    ) ORDER BY d.day
  ) INTO v_growth
  FROM generate_series(v_period_start::date, now()::date, '1 day') AS d(day)
  LEFT JOIN (SELECT created_at::date d, COUNT(*) cnt FROM profiles GROUP BY 1) u ON u.d = d.day
  LEFT JOIN (SELECT created_at::date d, COUNT(*) cnt FROM products GROUP BY 1) l ON l.d = d.day
  LEFT JOIN (SELECT created_at::date d, COUNT(*) cnt FROM messages GROUP BY 1) m ON m.d = d.day;

  -- ── By category ─────────────────────────────────────────────────
  SELECT jsonb_agg(jsonb_build_object('category', category, 'count', cnt) ORDER BY cnt DESC)
  INTO v_by_category
  FROM (
    SELECT category, COUNT(*) cnt FROM products WHERE is_active GROUP BY category LIMIT 7
  ) t;

  -- ── By city ─────────────────────────────────────────────────────
  SELECT jsonb_agg(jsonb_build_object('city', city, 'count', cnt) ORDER BY cnt DESC)
  INTO v_by_city
  FROM (
    SELECT city, COUNT(*) cnt FROM profiles WHERE city IS NOT NULL GROUP BY city LIMIT 10
  ) t;

  -- ── User funnel ─────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'signed_up',   (SELECT COUNT(*) FROM profiles),
    'listed',      (SELECT COUNT(DISTINCT seller_id) FROM products),
    'got_message', (SELECT COUNT(DISTINCT seller_id) FROM conversations),
    'sold',        (SELECT COUNT(DISTINCT seller_id) FROM products WHERE sold)
  ) INTO v_funnel;

  -- ── Top listings by views ───────────────────────────────────────
  SELECT jsonb_agg(row_to_json(t)) INTO v_top
  FROM (
    SELECT
      p.title,
      p.category,
      p.price,
      p.city,
      COALESCE(p.views_count, 0)                          AS views,
      EXTRACT(DAY FROM now() - p.created_at)::int         AS days_listed,
      EXISTS (SELECT 1 FROM conversations c WHERE c.product_id = p.id) AS has_messages
    FROM products p
    WHERE p.is_active AND NOT p.sold
    ORDER BY p.views_count DESC NULLS LAST
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'ok',          true,
    'kpis',        v_kpis,
    'growth',      COALESCE(v_growth, '[]'::jsonb),
    'by_category', COALESCE(v_by_category, '[]'::jsonb),
    'by_city',     COALESCE(v_by_city, '[]'::jsonb),
    'funnel',      v_funnel,
    'top_listings', COALESCE(v_top, '[]'::jsonb)
  );
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_get_users(
  p_token  text,
  p_search text DEFAULT '',
  p_page   int  DEFAULT 0,
  p_limit  int  DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm   record;
  v_users jsonb;
  v_total bigint;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  SELECT COUNT(*) INTO v_total FROM profiles
  WHERE p_search = ''
     OR full_name ILIKE '%' || p_search || '%'
     OR email     ILIKE '%' || p_search || '%';

  SELECT jsonb_agg(row_to_json(r)) INTO v_users
  FROM (
    SELECT
      pr.id,
      pr.full_name                                              AS name,
      pr.email,
      pr.city,
      to_char(pr.created_at, 'DD Mon YYYY')                   AS created_at,
      (SELECT COUNT(*) FROM products WHERE seller_id = pr.id) AS listings,
      (SELECT COUNT(*) FROM products WHERE seller_id = pr.id AND sold) AS sales,
      NOT pr.is_active                                         AS is_banned
    FROM profiles pr
    WHERE p_search = ''
       OR pr.full_name ILIKE '%' || p_search || '%'
       OR pr.email     ILIKE '%' || p_search || '%'
    ORDER BY pr.created_at DESC
    LIMIT p_limit OFFSET (p_page * p_limit)
  ) r;

  RETURN jsonb_build_object('ok', true, 'users', COALESCE(v_users, '[]'::jsonb), 'total', v_total);
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_get_listings(
  p_token  text,
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_page   int  DEFAULT 0,
  p_limit  int  DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm      record;
  v_listings jsonb;
  v_total    bigint;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  SELECT COUNT(*) INTO v_total FROM products p
  WHERE (p_search = '' OR p.title ILIKE '%' || p_search || '%')
    AND (p_status = 'all'
      OR (p_status = 'active'  AND p.is_active AND NOT p.sold)
      OR (p_status = 'sold'    AND p.sold)
      OR (p_status = 'removed' AND NOT p.is_active));

  SELECT jsonb_agg(row_to_json(r)) INTO v_listings
  FROM (
    SELECT
      p.id,
      p.title,
      p.category,
      p.price,
      p.city,
      CASE
        WHEN NOT p.is_active THEN 'removed'
        WHEN p.sold          THEN 'sold'
        ELSE 'active'
      END                                                AS status,
      COALESCE(p.views_count, 0)                         AS views,
      to_char(p.created_at, 'DD Mon YYYY')              AS created_at,
      EXISTS (
        SELECT 1 FROM flags f WHERE f.product_id = p.id AND f.status = 'pending'
      )                                                  AS flagged
    FROM products p
    WHERE (p_search = '' OR p.title ILIKE '%' || p_search || '%')
      AND (p_status = 'all'
        OR (p_status = 'active'  AND p.is_active AND NOT p.sold)
        OR (p_status = 'sold'    AND p.sold)
        OR (p_status = 'removed' AND NOT p.is_active))
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET (p_page * p_limit)
  ) r;

  RETURN jsonb_build_object('ok', true, 'listings', COALESCE(v_listings, '[]'::jsonb), 'total', v_total);
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_get_flags(
  p_token  text,
  p_status text DEFAULT 'pending',
  p_page   int  DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm   record;
  v_flags jsonb;
  v_total bigint;
  v_limit int := 25;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  SELECT COUNT(*) INTO v_total FROM flags WHERE status = p_status;

  SELECT jsonb_agg(row_to_json(r)) INTO v_flags
  FROM (
    SELECT
      f.id,
      f.reason,
      f.status,
      to_char(f.created_at, 'DD Mon YYYY HH24:MI') AS created_at,
      p.title AS product_title,
      p.price AS product_price,
      p.id    AS product_id
    FROM flags f
    LEFT JOIN products p ON p.id = f.product_id
    WHERE f.status = p_status
    ORDER BY f.created_at DESC
    LIMIT v_limit OFFSET (p_page * v_limit)
  ) r;

  RETURN jsonb_build_object(
    'ok',    true,
    'flags', COALESCE(v_flags, '[]'::jsonb),
    'total', v_total
  );
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_action(
  p_token       text,
  p_action      text,
  p_target_type text  DEFAULT NULL,
  p_target_id   text  DEFAULT NULL,
  p_details     jsonb DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm        record;
  v_resolution text;
  v_product_id uuid;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  INSERT INTO audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_adm.admin_id, p_action, p_target_type, p_target_id, p_details);

  IF p_action = 'ban_user' THEN
    UPDATE profiles SET is_active = false WHERE id = p_target_id::uuid;
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'unban_user' THEN
    UPDATE profiles SET is_active = true WHERE id = p_target_id::uuid;
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'remove_listing' THEN
    UPDATE products SET is_active = false WHERE id = p_target_id::uuid;
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'restore_listing' THEN
    UPDATE products SET is_active = true WHERE id = p_target_id::uuid;
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'resolve_flag' THEN
    v_resolution := p_details->>'resolution';

    SELECT product_id INTO v_product_id FROM flags WHERE id = p_target_id::uuid;

    UPDATE flags
    SET    status      = v_resolution,
           resolved_by = v_adm.admin_id,
           resolved_at = now()
    WHERE  id = p_target_id::uuid;

    IF v_resolution = 'removed' THEN
      UPDATE products SET is_active = false WHERE id = v_product_id;
    END IF;

    RETURN jsonb_build_object('ok', true);

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown action: ' || p_action);
  END IF;
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_manage_admins(
  p_token  text,
  p_action text,
  p_target jsonb DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm    record;
  v_admins jsonb;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  IF p_action = 'list' THEN
    SELECT jsonb_agg(row_to_json(r)) INTO v_admins
    FROM (
      SELECT
        id, email, name, role, is_active,
        to_char(last_login,  'DD Mon YYYY HH24:MI') AS last_login_at,
        to_char(created_at,  'DD Mon YYYY')         AS created_at
      FROM admin_users
      ORDER BY role, created_at
    ) r;
    RETURN jsonb_build_object('ok', true, 'admins', COALESCE(v_admins, '[]'::jsonb));

  ELSIF p_action = 'create' THEN
    IF v_adm.admin_role > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admins can create accounts');
    END IF;
    INSERT INTO admin_users (email, name, password_hash, role)
    VALUES (
      lower(trim(p_target->>'email')),
      p_target->>'name',
      crypt(p_target->>'password', gen_salt('bf')),
      COALESCE((p_target->>'role')::smallint, 1)
    )
    RETURNING id INTO v_new_id;
    INSERT INTO audit_log (admin_id, action, target_id, details)
    VALUES (v_adm.admin_id, 'create_admin', v_new_id::text,
            jsonb_build_object('email', p_target->>'email'));
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'update_role' THEN
    IF v_adm.admin_role > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admins can change roles');
    END IF;
    UPDATE admin_users
    SET    role = (p_target->>'role')::smallint
    WHERE  id   = (p_target->>'id')::uuid AND role > 0;
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'deactivate' THEN
    IF v_adm.admin_role > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admins can remove accounts');
    END IF;
    UPDATE admin_users SET is_active = false
    WHERE id = (p_target->>'id')::uuid AND role > 0;
    RETURN jsonb_build_object('ok', true);

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown action');
  END IF;
END;
$$;

-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION admin_get_audit(
  p_token text,
  p_page  int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_adm   record;
  v_logs  jsonb;
  v_total bigint;
  v_limit int := 50;
BEGIN
  SELECT * INTO v_adm FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  SELECT COUNT(*) INTO v_total FROM audit_log;

  SELECT jsonb_agg(row_to_json(r)) INTO v_logs
  FROM (
    SELECT
      al.id,
      au.name                                        AS admin,
      al.action,
      COALESCE(al.target_type, '') || ':' || COALESCE(al.target_id, '—') AS target,
      al.details,
      al.ip_address                                  AS ip,
      to_char(al.created_at, 'DD Mon YYYY HH24:MI') AS time
    FROM audit_log al
    LEFT JOIN admin_users au ON au.id = al.admin_id
    ORDER BY al.created_at DESC
    LIMIT v_limit OFFSET (p_page * v_limit)
  ) r;

  RETURN jsonb_build_object('ok', true, 'logs', COALESCE(v_logs, '[]'::jsonb), 'total', v_total);
END;
$$;

-- ================================================================
-- SEED: Create your first Super Admin account
--
-- 1. Replace the values below with real credentials
-- 2. Uncomment the INSERT block
-- 3. Run this file in Supabase SQL Editor
-- 4. Re-comment or delete this block after running
-- ================================================================

-- INSERT INTO admin_users (email, name, password_hash, role)
-- VALUES (
--   'admin@metups.com',          -- your admin email
--   'Metups Admin',              -- display name
--   crypt('change-this-password', gen_salt('bf')),
--   0                            -- 0 = Super Admin
-- )
-- ON CONFLICT (email) DO NOTHING;
