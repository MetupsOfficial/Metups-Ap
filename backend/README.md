# Metups WhatsApp Worker

The Worker is the buyer-facing Metups WhatsApp interface. It verifies Meta
webhooks, persists and deduplicates incoming messages, maintains a compact
30-minute search session, classifies buyer intent, searches the live catalogue,
returns up to three interactive product results, and supports refinements,
incremental results, selection, seller contact links, and reporting.

Sellers create and manage listings through the Metups website. WhatsApp does
not create product listings.

##t Local development

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars
npm run dev -- --env development
```

Fill in `.dev.vars` locally. It is ignored by Git and must never be committed.

## Worker secrets and deployment

Set secrets separately for each Worker environment. Wrangler prompts for each
value; do not put real credentials in `wrangler.jsonc`, `.dev.vars.example`,
or source code.

```bash
cd backend

npx wrangler secret put SUPABASE_URL --env development
npx wrangler secret put SUPABASE_SECRET_KEY --env development
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --env development
npx wrangler secret put META_APP_SECRET --env development
npx wrangler secret put GEMINI_API_KEY --env development
npx wrangler secret put WA_TOKEN --env development
npx wrangler secret put WA_PHONE_NUMBER_ID --env development
npx wrangler secret put PLACEHOLDER_IMAGE_URL --env development
npx wrangler deploy --env development

npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_SECRET_KEY --env production
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler secret put GEMINI_API_KEY --env production
npx wrangler secret put WA_TOKEN --env production
npx wrangler secret put WA_PHONE_NUMBER_ID --env production
npx wrangler secret put PLACEHOLDER_IMAGE_URL --env production
npx wrangler deploy --env production
```

`SUPABASE_SECRET_KEY` is server-only and bypasses RLS; it must never reach a
client response. `WA_TOKEN` authorizes outbound WhatsApp messages. The phone
number ID and placeholder URL are not themselves secret, but keeping them as
Worker secrets avoids hardcoding environment-specific values.

`GEMINI_API_KEY` enables the Gemini provider. `GEMINI_MODEL` and
`GEMINI_TIMEOUT_MS` are non-secret Worker configuration in `wrangler.jsonc`.
An optional local OpenAI-compatible provider uses `LOCAL_AI_BASE_URL`,
`LOCAL_AI_API_KEY`, `LOCAL_AI_MODEL`, and `LOCAL_AI_TIMEOUT_MS`; when it is
configured it is tried before Gemini for buyer conversation tasks.

`WHATSAPP_RATE_LIMIT_PER_MINUTE` is non-secret configuration. It defaults to
20 messages per phone number per rolling minute and is enforced before Gemini
or marketplace actions run.

`SEARCH_REFINEMENT_CHEAPER_FACTOR` defaults to `0.8` and controls the
deterministic “show cheaper ones” follow-up. `PLACEHOLDER_IMAGE_URL` must be a
public HTTPS image because Meta carousels require an image in every card.

## Database deployment order

Run the WhatsApp migrations in Supabase before deploying the matching Worker
revision. For the current buyer search implementation, confirm the prior
feature migrations are present, then apply:

```text
database/migrations/whatsapp_stage10_rate_limit.sql
database/migrations/whatsapp_stage11_observability.sql
database/migrations/whatsapp_stage13_provider_agnostic_observability.sql
```

The incremental-search feature uses the existing `whatsapp_sessions.context`
JSONB column and needs no new database migration.

## Release checklist

1. Set the production secrets above and confirm non-secret values in
   `wrangler.jsonc`.
2. Confirm the Meta sending number has display-name approval.
3. Run `npm test` and `npx wrangler deploy --dry-run --env production`.
4. Deploy only with explicit authorization.
5. Validate search, “show me more”, refinement, current-batch selection,
   seller contact, reporting, and exhausted-results messaging on a real phone.

## Controlled AI capacity test

Use the development-only AI endpoint, never `/webhook`, to measure normal
conversation capacity. This does not send WhatsApp messages or write search
sessions, but it does consume the configured AI provider's quota/capacity.

Start the development Worker in one terminal:

```bash
npm run dev -- --env development
```

Then start with the safe default of 20 sequential requests:

```bash
node scripts/ai-load-test.js
```

Increase gradually only after reviewing the previous summary. For example,
this sends at most 100 requests one at a time, 500 ms apart:

```bash
node scripts/ai-load-test.js --max 100 --concurrency 1 --delay-ms 500
```

The summary shows provider counts, latency percentiles, and the first failure.
Because the local provider is primary and Gemini is a fallback, a successful
request handled by `gemini` proves fallback behavior—not local-provider
capacity. Stop when a limit, timeout, fallback pattern, or unacceptable
latency appears; do not try to deliberately exhaust a paid API quota.


## Endpoints

- `GET /health` returns status, timestamp, and environment.
- `GET /webhook` completes Meta's verification handshake.
- `POST /webhook` verifies the Meta signature, returns `200` promptly, then
  processes the normalized inbound message with `ctx.waitUntil`.
- `POST /__dev/ai-test` validates the configured AI provider in development
  only and requires `x-metups-dev-token`.
- `POST /__dev/workers-ai-test` benchmarks an allowed Workers AI model in
  development only and requires `x-metups-dev-token`.

## Operational notes

The Worker records aggregate-safe operational events in `whatsapp_events`.
The admin observability migration returns aggregate metrics only; do not add
message text or buyer phone numbers to dashboards.
