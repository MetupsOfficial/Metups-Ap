-- Stage 10A: atomic rolling one-minute quota per WhatsApp sender.
-- This is intentionally server-only; public clients cannot consume or inspect
-- another sender's quota.
CREATE TABLE IF NOT EXISTS whatsapp_rate_limits (
  phone text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION consume_whatsapp_rate_limit(
  p_phone text,
  p_limit integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_limit integer := GREATEST(1, COALESCE(p_limit, 20));
BEGIN
  IF COALESCE(length(trim(p_phone)), 0) = 0 THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  INSERT INTO whatsapp_rate_limits (phone, window_started_at, message_count, updated_at)
  VALUES (p_phone, now(), 1, now())
  ON CONFLICT (phone) DO UPDATE
  SET window_started_at = CASE
        WHEN whatsapp_rate_limits.window_started_at <= now() - interval '1 minute' THEN now()
        ELSE whatsapp_rate_limits.window_started_at
      END,
      message_count = CASE
        WHEN whatsapp_rate_limits.window_started_at <= now() - interval '1 minute' THEN 1
        ELSE whatsapp_rate_limits.message_count + 1
      END,
      updated_at = now()
  RETURNING message_count INTO v_count;

  RETURN jsonb_build_object('allowed', v_count <= v_limit, 'count', v_count, 'limit', v_limit);
END;
$$;

REVOKE ALL ON FUNCTION consume_whatsapp_rate_limit(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_whatsapp_rate_limit(text, integer) TO service_role;
