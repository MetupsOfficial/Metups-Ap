-- WhatsApp Stage 9B: token-protected aggregates for the existing admin UI.
-- Returns no phone numbers or message contents.
CREATE OR REPLACE FUNCTION admin_get_whatsapp_stats(
  p_token text,
  p_days integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin record;
  v_days integer := GREATEST(1, LEAST(COALESCE(p_days, 30), 365));
  v_start timestamptz;
  v_kpis jsonb;
  v_daily jsonb;
  v_intents jsonb;
BEGIN
  SELECT * INTO v_admin FROM _admin_check_token(p_token);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized'); END IF;

  v_start := now() - make_interval(days => v_days);

  SELECT jsonb_build_object(
    'messages_received', (SELECT COUNT(*) FROM whatsapp_events WHERE event_type = 'message_received' AND created_at >= v_start),
    'searches', (SELECT COUNT(*) FROM whatsapp_events WHERE event_type = 'search_run' AND created_at >= v_start),
    'listings_published', (SELECT COUNT(*) FROM whatsapp_events WHERE event_type = 'listing_published' AND created_at >= v_start),
    'reports', (SELECT COUNT(*) FROM whatsapp_events WHERE event_type = 'listing_reported' AND created_at >= v_start),
    'replies_sent', (SELECT COUNT(*) FROM whatsapp_events WHERE event_type = 'reply_sent' AND created_at >= v_start),
    'active_sessions', (SELECT COUNT(*) FROM whatsapp_sessions WHERE expires_at > now()),
    'avg_confidence', COALESCE((
      SELECT ROUND(AVG((payload->>'confidence')::numeric), 3)
      FROM whatsapp_events
      WHERE event_type = 'intent_classified'
        AND created_at >= v_start
        AND payload->>'provider' <> 'none'
    ), 0),
    'parser_success_rate', COALESCE((
      SELECT ROUND(100 * AVG(CASE WHEN payload->>'provider' <> 'none' THEN 1 ELSE 0 END), 1)
      FROM whatsapp_events
      WHERE event_type = 'intent_classified' AND created_at >= v_start
    ), 0),
    'unknown_rate', COALESCE((
      SELECT ROUND(100 * AVG(CASE WHEN payload->>'intent' = 'unknown' THEN 1 ELSE 0 END), 1)
      FROM whatsapp_events
      WHERE event_type = 'intent_classified' AND created_at >= v_start
    ), 0)
  ) INTO v_kpis;

  SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb) INTO v_daily
  FROM (
    SELECT
      to_char(days.day::date, 'YYYY-MM-DD') AS day,
      COUNT(e.id) FILTER (WHERE e.event_type = 'message_received') AS messages_received,
      COUNT(e.id) FILTER (WHERE e.event_type = 'search_run') AS searches,
      COUNT(e.id) FILTER (WHERE e.event_type = 'listing_published') AS listings_published,
      COALESCE(ROUND(AVG((e.payload->>'confidence')::numeric) FILTER (
        WHERE e.event_type = 'intent_classified' AND e.payload->>'provider' <> 'none'
      ), 3), 0) AS avg_confidence
    FROM generate_series(v_start::date, now()::date, interval '1 day') AS days(day)
    LEFT JOIN whatsapp_events e ON e.created_at::date = days.day::date
    GROUP BY days.day
  ) d;

  SELECT COALESCE(jsonb_agg(row_to_json(i) ORDER BY i.count DESC, i.intent), '[]'::jsonb) INTO v_intents
  FROM (
    SELECT payload->>'intent' AS intent, COUNT(*) AS count,
      ROUND(AVG((payload->>'confidence')::numeric), 3) AS avg_confidence
    FROM whatsapp_events
    WHERE event_type = 'intent_classified'
      AND created_at >= v_start
      AND payload->>'intent' IS NOT NULL
    GROUP BY payload->>'intent'
    LIMIT 10
  ) i;

  RETURN jsonb_build_object(
    'ok', true,
    'period_days', v_days,
    'kpis', v_kpis,
    'daily', v_daily,
    'top_intents', v_intents
  );
END;
$$;
