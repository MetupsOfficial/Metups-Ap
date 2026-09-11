# WhatsApp decision log

## Stage 1 — message intake and normalization

- **Retain `whatsappmessages`.** It already receives inbound data, and unique `message_id` is the durable retry guard.
- **Acknowledge Meta before database work completes.** The Worker uses `waitUntil`; durable uniqueness protects against retries and concurrent deliveries.
- **Persist compact normalized data only.** Type-specific metadata is in `content`; the unmodified Meta message is in memory only for later stages.
- **Create `whatsapp_events` now.** Stage 1 needs durable `message_received` events; later analytics will aggregate this table rather than add a second event source.
