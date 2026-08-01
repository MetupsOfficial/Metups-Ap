# Metups

Metups is split into a Cloudflare Pages frontend, a Cloudflare Worker API, and
Supabase database assets.

## What it does

- `frontend/` — static site deployed to Cloudflare Pages (`metups.com`)
- `backend/` — WhatsApp webhook API deployed to Cloudflare Workers (`api.metups.com`)
- `database/` — Supabase migrations, policies, and Edge Functions
- Extracts the sender phone and message body
- Parses basic buyer intent for search requests
- Queries the existing Metups Supabase products table
- Formats a concise response for WhatsApp

## Local run

```bash
cd backend
npm install
cp ../.env.example ../.env
npm start
```

## Runtime configuration

Never commit real credentials. Copy [`.env.example`](.env.example) to `.env`
for local values; Cloudflare Worker values belong in `backend/.dev.vars` locally
and in Worker secrets in production.

The frontend reads public Supabase settings from the ignored
`frontend/assets/js/runtime-config.js`. Copy
[`runtime-config.example.js`](frontend/assets/js/runtime-config.example.js) to
that filename for local development, and generate the same file from deployment
secrets during your Cloudflare Pages build. Supabase URL and anon keys are
browser-visible configuration, not private credentials; keep RLS enabled and
never expose a service-role key.

Set Edge Function values (`RESEND_API_KEY`, `FROM_EMAIL`, `APP_URL`, and any
Twilio credentials) through Supabase Edge Function secrets.

## Health check

```bash
curl http://localhost:3000/health
```
