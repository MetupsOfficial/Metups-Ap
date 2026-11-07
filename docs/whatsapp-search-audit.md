# WhatsApp marketplace search audit

Date: 2026-11-06

This audit records repository evidence gathered before changing the WhatsApp
search pipeline.

## Confirmed current flow

`worker.ts` verifies the Meta signature, normalizes and deduplicates inbound
messages, loads a phone-keyed session, handles numeric selection/report
commands, runs deterministic classification, then calls the AI router only
when needed. A classified search is converted to criteria in
`search-service.js`, queried from Supabase, ranked by `ranking-service.js`,
and sent through `whatsappService.js`.

The webhook acknowledges immediately and processes the message through
`waitUntil`; message IDs prevent retried webhooks from being processed twice.
Sessions expire after a rolling 30-minute TTL by default. Their compact
`context.search` value contains the latest criteria and presented result IDs.

## Provider architecture

`src/ai/router.ts` is the only provider entry point. It configures and orders
providers per task:

1. The OpenAI-compatible local Qwen endpoint (`localLlama.ts`) is primary for
   `buyer_search` and `conversation` when its four `LOCAL_AI_*` variables are
   configured.
2. Gemini is a fallback for those tasks and the only configured provider for
   the remaining task types.

Both providers return the shared `AIResult` contract. Provider failure falls
through once to the next provider; there is no provider retry loop. The
development-only AI test endpoint is rejected outside the development
environment and requires its dedicated token.

## Marketplace schema and canonical data

The website product form and seller flow establish these exact condition
values:

- `New`
- `Like-New`
- `Fair`
- `Needs Repair`

Customer language must normalize to those values. In particular, `used` and
`second-hand` mean `Fair`; unknown condition text must become `null`, never an
arbitrary database filter.

`products.location` is the seller-entered location field (the website labels
it “City, Area”). `city_name` is also selected by the WhatsApp query. Search
now uses one PostgREST OR group across both fields, so older and newer listing
representations can match a buyer's city. Query-construction tests assert that
filter as well as the active, unsold, price, condition, and category filters.

The active search reads products with `is_active = true` and `sold = false`,
then selects title, description, price, condition, category, location,
city_name, creation time, the seller relationship, and ordered
`product_images`. Images are in the `product_images` storage bucket. A stored
image path is converted to a public HTTPS URL; invalid/missing images do not
fail the result.

Search returns at most 20 candidates and deterministic ranking presents at
most three. Ranking combines relevance, optional filters, freshness, and
seller rating. It does not make database calls, and defensively excludes an
inactive or sold row if an upstream query ever regresses.

## Gaps identified before implementation

1. `buildSearchCriteria()` converts `null` to `0` through `Number(null)`.
   Missing budget must remain `null`; numeric zero must remain valid zero.
2. Conditions are normalized in the fast classifier only. AI extraction and
   refinement can still produce non-canonical values.
3. Search refinement currently recognizes only relative price phrases.
   It does not yet deterministically support “under $200”, location changes,
   condition changes, or explicit replacement categories using the prior
   compact search context.
4. The conversation prompt uses `second-hand` in its example rather than the
   marketplace canonical `Fair` condition, creating a boundary mismatch.
5. Provider selection and a controlled live WhatsApp validation still need
   production-environment confirmation after the Worker is deployed. Unit
   coverage now includes budget boundaries, canonical conditions, refinement,
   query construction, unavailable-listing ranking protection, and
   conversation-output validation.
6. Legacy `backend/services/searchService.js` is separately tested but is not
   used by `src/worker.ts`; implementation work must target the `src/` pipeline
   and avoid accidentally creating a second search path.

## Implementation sequence

1. Strengthen canonical criteria normalization and add regression tests.
2. Make fast intent detection conservative but cover clear buyer and seller
   messages, with canonical condition extraction.
3. Align AI conversation validation/instructions with canonical criteria and
   distinguish invalid output from provider failures.
4. Extend safe refinement based only on the session's latest search context.
5. Add query/ranking/worker-path tests and duration/AI-call observability.
6. Run the full suite, production build check, and then perform controlled
   live validation after deployment.
