-- WhatsApp Stage 6: publication observability.
-- Product, product_images, and the product_images storage bucket are existing
-- shared marketplace resources; no WhatsApp-specific listing table is created.

ALTER TABLE whatsapp_events DROP CONSTRAINT IF EXISTS whatsapp_events_event_type_check;
ALTER TABLE whatsapp_events
  ADD CONSTRAINT whatsapp_events_event_type_check
  CHECK (event_type IN (
    'message_received', 'intent_classified', 'search_run', 'reply_sent',
    'listing_published', 'error'
  ));
