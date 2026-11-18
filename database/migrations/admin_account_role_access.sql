-- ============================================================
-- Admin access through a normal Metups account
--
-- Admins authenticate with Supabase Auth like every other user. A separate
-- short-lived admin token is issued only after this server-side function
-- verifies auth.uid() and profiles.role = 'admin'.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('user', 'admin');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Profile RLS previously allowed an account to update any of its own columns.
-- Once a role column exists, that would permit self-promotion. Preserve normal
-- self-service profile edits while requiring the existing role to be retained.
CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_account_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_account_role() TO authenticated;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.current_account_role());

-- Keep the existing admin permission levels (Super Admin/Admin/Moderator/
-- Analyst) but bind every active admin record to one Metups profile.
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_profile_id_unique
  ON public.admin_users(profile_id)
  WHERE profile_id IS NOT NULL;

-- Safe one-time link for accounts that use the same verified email. An admin
-- without a matching Metups account stays inactive until an operator links it.
UPDATE public.admin_users au
SET profile_id = p.id
FROM public.profiles p
WHERE au.profile_id IS NULL
  AND lower(trim(au.email)) = lower(trim(p.email));

UPDATE public.profiles p
SET role = 'admin'
FROM public.admin_users au
WHERE au.profile_id = p.id
  AND au.is_active = true;

CREATE OR REPLACE FUNCTION public.admin_issue_session_from_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_admin public.admin_users%ROWTYPE;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sign in to your Metups account first');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND OR v_profile.role <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This account does not have administrator access');
  END IF;

  SELECT * INTO v_admin
  FROM public.admin_users
  WHERE profile_id = auth.uid()
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Administrator account setup is incomplete');
  END IF;

  INSERT INTO public.admin_tokens (admin_id)
  VALUES (v_admin.id)
  RETURNING token INTO v_token;

  UPDATE public.admin_users
  SET last_login = now()
  WHERE id = v_admin.id;

  INSERT INTO public.audit_log (admin_id, action, details)
  VALUES (v_admin.id, 'account_admin_session_issued', jsonb_build_object('profile_id', auth.uid()));

  RETURN jsonb_build_object(
    'ok', true,
    'token', v_token,
    'admin', jsonb_build_object(
      'id', v_admin.id,
      'name', v_admin.name,
      'role', v_admin.role,
      'email', v_admin.email
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_issue_session_from_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_issue_session_from_account() TO authenticated;

-- The old independent password endpoint must not remain a bypass around the
-- Metups account/role check. Existing dashboard token RPCs continue to work.
REVOKE ALL ON FUNCTION public.admin_login(text, text, text) FROM PUBLIC, anon, authenticated;

-- Admin management now grants access to an existing Metups account. It never
-- creates a second password or a separate identity.
CREATE OR REPLACE FUNCTION public.admin_manage_admins(
  p_token text,
  p_action text,
  p_target jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adm record;
  v_admins jsonb;
  v_new_id uuid;
  v_profile_id uuid;
  v_target_admin_id uuid;
BEGIN
  SELECT * INTO v_adm FROM public._admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  IF p_action = 'list' THEN
    SELECT jsonb_agg(row_to_json(r)) INTO v_admins
    FROM (
      SELECT id, email, name, role, is_active,
        to_char(last_login, 'DD Mon YYYY HH24:MI') AS last_login_at,
        to_char(created_at, 'DD Mon YYYY') AS created_at
      FROM public.admin_users
      ORDER BY role, created_at
    ) r;
    RETURN jsonb_build_object('ok', true, 'admins', COALESCE(v_admins, '[]'::jsonb));

  ELSIF p_action = 'create' THEN
    IF v_adm.admin_role > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admins can grant admin access');
    END IF;
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(p_target->>'email'));
    IF v_profile_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This person must create a Metups account before admin access can be granted');
    END IF;
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE profile_id = v_profile_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This Metups account already has an admin record');
    END IF;
    INSERT INTO public.admin_users (email, name, password_hash, role, profile_id)
    VALUES (
      lower(trim(p_target->>'email')),
      coalesce(nullif(trim(p_target->>'name'), ''), split_part(p_target->>'email', '@', 1)),
      crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
      coalesce((p_target->>'role')::smallint, 1),
      v_profile_id
    ) RETURNING id INTO v_new_id;
    UPDATE public.profiles SET role = 'admin' WHERE id = v_profile_id;
    INSERT INTO public.audit_log (admin_id, action, target_id, details)
    VALUES (v_adm.admin_id, 'grant_admin_access', v_new_id::text,
      jsonb_build_object('profile_id', v_profile_id, 'email', p_target->>'email'));
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'update_role' THEN
    IF v_adm.admin_role > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admins can change roles'); END IF;
    UPDATE public.admin_users SET role = (p_target->>'role')::smallint
    WHERE id = (p_target->>'id')::uuid AND role > 0;
    RETURN jsonb_build_object('ok', true);

  ELSIF p_action = 'deactivate' THEN
    IF v_adm.admin_role > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Only Super Admins can remove accounts'); END IF;
    UPDATE public.admin_users SET is_active = false
    WHERE id = (p_target->>'id')::uuid AND role > 0
    RETURNING profile_id INTO v_profile_id;
    IF v_profile_id IS NOT NULL THEN UPDATE public.profiles SET role = 'user' WHERE id = v_profile_id; END IF;
    RETURN jsonb_build_object('ok', true);

  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown action');
  END IF;
END;
$$;
