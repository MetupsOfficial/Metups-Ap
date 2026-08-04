# Metups WhatsApp Worker

Phase 1 provides only the Worker transport layer: Meta verification, a webhook
acknowledgement stub, health checks, request logging, and a server-side
Supabase client. It does not parse WhatsApp messages or implement bot logic.

## Local development

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
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --env development
npx wrangler secret put META_APP_SECRET --env development
npx wrangler deploy --env development

npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler deploy --env production
```

`ENVIRONMENT` is non-secret configuration in `wrangler.jsonc`. The service-role
key remains server-side and is never returned in a response.

## Endpoints

- `GET /health` returns status, timestamp, and environment.
- `GET /webhook` completes Meta's verification handshake.
- `POST /webhook` returns `200` while event handling awaits the next phase.
