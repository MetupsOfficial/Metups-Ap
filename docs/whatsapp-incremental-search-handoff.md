# WhatsApp incremental-search handoff

Date: 2026-11-17 (Africa/Harare)

## Initial findings

The existing buyer search already used the real `products` table, enforced
`is_active = true` and `sold = false`, ranked up to three listings, and kept
only the latest `resultIds` for numeric selection. It did not retain the full
history of listings previously displayed. Consequently, a “show me more”
request could repeat the same highest-ranked listings.

Interactive image delivery, seller contact links, result ranking, session TTL,
and the AI routing architecture were already present and were preserved.

The buyer-facing copy was also too mechanical: a vague request could search
immediately without enough context, and zero/exhausted results used rigid
numbered instructions.

## Architecture decisions

- `search-history-service.js` owns compact session-search state.
  `resultIds` contains only the latest delivered batch; `seenProductIds`
  contains every delivered product in the active search.
- Existing sessions without `seenProductIds` remain compatible: their current
  `resultIds` become the initial seen history.
- `searchProducts(..., { excludeIds })` validates and deduplicates PostgreSQL
  UUID text, then applies a database-level `not id in (...)` filter before
  candidate limiting and ranking.
- Exact “more results” phrases are deterministic and use no AI call. They
  retain criteria and exclude seen products. Filter-changing refinements reset
  result history; a new `search_product` always starts fresh.
- Search state is written only after `sendResults()` or the exhausted text
  response completes successfully. The existing rich-image and fallback
  delivery behavior is unchanged.
- An exhausted search says that all matching listings have been shown; it does
  not incorrectly say that the marketplace has no matching listings.
- A previously selected product remains reportable after an exhausted batch,
  while numeric selection is limited to the latest batch only.
- `buyer-conversation-service.js` stores one compact pre-search draft when an
  item or town is missing. It asks one natural question at a time, accepts a
  short deterministic answer such as “Harare under $100”, and does not require
  a budget before browsing.
- Carousel messages can carry one concise conversational intro without sending
  an additional WhatsApp message. Zero and exhausted replies offer the buyer a
  concrete next step: adjust budget, town, or product.

## Files changed for this feature

- `backend/src/search-history-service.js` — history validation, compatibility,
  pagination state, and reset detection.
- `backend/src/search-service.js` — optional database-level product exclusion.
- `backend/src/search-refinement-service.js` — pure more-results recognition.
- `backend/src/buyer-selection-service.js` — session-bound selection/report
  action resolution.
- `backend/src/buyer-conversation-service.js` — compact clarification draft
  handling and deterministic short-answer parsing.
- `backend/src/worker.ts` — pagination, reset, post-delivery state updates,
  exhausted response, and aggregate search event fields.
- `backend/utils/formatter.js` — exhausted-result message.
- `backend/services/whatsappService.js` and `backend/utils/formatter.js` —
  conversational carousel introduction and natural buyer-facing wording.
- Related unit and buyer-journey tests — exclusion, state transitions,
  selection, reporting, and exhausted result sets.

## Verification

Executed locally on 2026-11-17:

- `npm test` — 21 test files passed; no failures.
- `XDG_CONFIG_HOME=/tmp/metups-wrangler-config npx wrangler deploy --dry-run --env production` — passed.

The scenario coverage includes seven matching listings delivered as three,
then three different listings, then one, then an exhausted response.
It also covers “fridge” → location question → “Harare under $100” → search.

## Resource impact and remaining concerns

Pagination adds no AI call. It retains a compact UUID-only history in the
existing JSONB session and adds one `NOT IN` filter to the same product query;
it does not add tables, services, or background jobs. Each buyer request still
gets at most one rich result message, capped at three listings.

The changes are local only and have not been deployed. Before production
release, run the pending WhatsApp migrations listed in
`whatsapp-milestones.md`, deploy with production secrets, obtain Meta sending
approval, and perform the live validation checklist. The main residual risk is
real WhatsApp/Meta delivery behavior, which local mocks cannot prove.
