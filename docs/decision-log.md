# WhatsApp decision log

## Stage 1 — message intake and normalization

- **Retain `whatsappmessages`.** It already receives inbound data, and unique `message_id` is the durable retry guard.
- **Acknowledge Meta before database work completes.** The Worker uses `waitUntil`; durable uniqueness protects against retries and concurrent deliveries.
- **Persist compact normalized data only.** Type-specific metadata is in `content`; the unmodified Meta message is in memory only for later stages.
- **Create `whatsapp_events` now.** Stage 1 needs durable `message_received` events; later analytics will aggregate this table rather than add a second event source.

## Stage 2 — conversation sessions

- **Keep one session per phone number.** `whatsapp_sessions.phone` remains unique, so separate phone numbers cannot share state.
- **Make expiry rolling and configurable.** `SESSION_TTL_MINUTES` is environment configuration, set to 30 minutes by default in each Worker environment.
- **Reset only conversational state.** Expiry clears intent, stage, and context while retaining `profile_id` for future account linking.
- **Centralize writes in `session-service.js`.** The Worker and later stages must use this service instead of writing `whatsapp_sessions` directly.

## Stage 3 — intent understanding

- **Use Mistral only in the first provider implementation.** The Worker calls the provider-agnostic AI router and task wrappers; only `ai/providers/mistral.ts` calls Mistral. Future providers are added as provider files and router entries, without changing marketplace business logic.
- **Separate classification from replies.** The parser returns validated intent JSON only; WhatsApp reply composition remains a later stage.
- **Treat `profiles.id` as the canonical account identity.** Phone and email are optional credentials that resolve to one profile UUID, never independent profiles for the same person.
