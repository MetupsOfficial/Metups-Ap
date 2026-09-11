# Metups WhatsApp Worker

Stage 1 provides the Worker intake layer: Meta verification, health checks,
structured request logging, normalized inbound-message persistence, durable
deduplication, and a server-side Supabase client. It does not send WhatsApp
replies or implement bot logic.

##t Local development

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars
npm run dev -- --env development
```

Fill in `.dev.vars` locally. It is ignored by Git and must never be committed.

## Worker secrets and deployment

Set these secrets separately for each Worker environment. Wrangler prompts for
each value; do not put secrets in `wrangler.jsonc`.

```bash
cd backend

npx wrangler secret put SUPABASE_URL --env development
npx wrangler secret put SUPABASE_SECRET_KEY --env development
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --env development
npx wrangler secret put META_APP_SECRET --env development
npx wrangler deploy --env development

npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_SECRET_KEY --env production
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler deploy --env production
```

`ENVIRONMENT` is non-secret configuration in `wrangler.jsonc`. The secret key is
used with Supabase RLS and is never returned in a response.

## Endpoints

- `GET /health` returns status, timestamp, and environment.
- `GET /webhook` completes Meta's verification handshake.
- `POST /webhook` verifies the Meta signature, returns `200` promptly, then
  persists normalized inbound messages with `ctx.waitUntil`.

## Stage 1 database migration

Run `database/migrations/whatsapp_message_intake.sql` in the target Supabase
environment before deploying this Worker revision. It safely upgrades the
existing `whatsappmessages` table with correlation and type-specific content
fields, and creates `whatsapp_events` for intake telemetry.
