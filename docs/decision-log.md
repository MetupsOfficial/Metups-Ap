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

- **Use Gemini only in the first provider implementation.** The Worker calls the provider-agnostic AI router and task wrappers; only `ai/providers/gemini.ts` calls Gemini. Future providers are added as provider files and router entries, without changing marketplace business logic.
- **Separate classification from replies.** The parser returns validated intent JSON only; WhatsApp reply composition remains a later stage.
- **Treat `profiles.id` as the canonical account identity.** Phone and email are optional credentials that resolve to one profile UUID, never independent profiles for the same person.

## Stage 4 — product search

- **Reuse the marketplace tables.** WhatsApp searches `products` and seller rating data from `profiles`; it creates no WhatsApp-specific listing or seller tables.
- **Make discoverability explicit.** Active/unsold listing state is normalized to non-null booleans so website and WhatsApp use the same definition of searchable inventory.
- **Index only discoverable listings.** Partial filter and trigram indexes cover active, unsold listings without imposing index cost on sold or removed inventory.

## Stage 6 — seller listing

- **Match the website's listing contract.** WhatsApp will use the same category, condition, product, image-bucket, and product-image records as the website form.
- **Gate publication by one canonical profile UUID.** A seller draft may be collected without identity friction, but it cannot insert a listing until the WhatsApp phone is linked to an existing or newly linked `profiles.id`.
- **Copy WhatsApp images into the shared bucket before publishing.** The final confirmation creates the shared `products` row, downloads short-lived Meta media, uploads it under `users/{profileId}/{productId}/`, and records those storage paths in `product_images`. A failed image transfer deactivates the incomplete product and retains the draft for retry.

## Stage 8 — seller account linking

- **Keep buyer search anonymous.** A WhatsApp phone identifies a temporary search session only; it does not create a buyer account.
- **Create an account only at seller publication.** First reuse an existing phone-matched profile; otherwise create one phone-auth identity and its matching profile UUID through the server-side Supabase Admin API.

## Stage 4 — shared catalogue search

- **Use `products` as the only listing source.** WhatsApp and the website query the same active, unsold rows.
- **Normalize nullable listing status once.** Existing null `is_active` and `sold` values become `true` and `false`, then the columns are made non-null so shared search behavior is unambiguous.
- **Keep ranking outside the database query.** SQL fetches at most the matching candidate rows; a separate service will score relevance and select the top three.
