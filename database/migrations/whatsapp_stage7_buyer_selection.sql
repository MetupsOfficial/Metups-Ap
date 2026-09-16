-- Stage 7: buyer selection/report events. Reports use the existing `flags`
-- moderation queue; anonymous visitors deliberately have a null reporter_id.
ALTER TABLE whatsapp_events DROP CONSTRAINT IF EXISTS whatsapp_events_event_type_check;
ALTER TABLE whatsapp_events
  ADD CONSTRAINT whatsapp_events_event_type_check
  CHECK (event_type IN (
    'message_received', 'intent_classified', 'search_run', 'reply_sent',
    'listing_published', 'product_selected', 'listing_reported', 'error'
  ));
