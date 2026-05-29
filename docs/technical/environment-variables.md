# Environment Variables Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-005 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Classification** | Internal — Confidential |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial documentation |

---

## Important Note

Metups is a **static web application** with no server-side runtime. There are no server environment variables in the traditional sense. "Configuration" is managed differently:

1. **Client-side config** — hardcoded in `src/shared/supabase.js` (safe because these are public keys protected by RLS)
2. **Netlify build config** — in `netlify.toml`
3. **Sensitive secrets** — stored only in Supabase project settings and team password manager; NEVER in code

---

## Client-Side Configuration (`src/shared/supabase.js`)

| Variable | Value | Security Note |
|---------|-------|--------------|
| `SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` | **Public** — safe to expose. Access is controlled by RLS. |
| `SUPABASE_ANON_KEY` | `eyJ...` (JWT) | **Public** — the anon key is not a secret. It identifies the project. Security is enforced by RLS at the database level. |

**Why these are public:** The Supabase anon key is equivalent to an API key that grants read access subject to RLS policies. It is intentionally public and cannot be hidden in a client-side app.

---

## Sensitive Secrets (NEVER commit to Git)

| Secret | Location | Purpose | Rotation |
|--------|---------|---------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard only | Admin-level DB access (bypasses RLS) | Quarterly |
| `SUPABASE_DB_PASSWORD` | Supabase dashboard only | Direct DB connection | On exposure |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Supabase Auth settings | OAuth flow | Annually |
| `GOOGLE_OAUTH_CLIENT_ID` | Supabase Auth settings | OAuth flow | N/A (not secret) |

**Critical:** The SERVICE_ROLE_KEY bypasses Row Level Security. If this key is ever committed to Git or exposed publicly:
1. Immediately rotate it in Supabase → Project Settings → API
2. Revoke the old key
3. Audit logs for any unauthorised access

---

## Netlify Configuration (`netlify.toml`)

Netlify environment variables (for future use, e.g., build-time injection):

| Variable | Purpose | Set In |
|---------|---------|--------|
| `[FUTURE_VAR]` | [PURPOSE] | Netlify Dashboard → Site → Environment Variables |

---

## Google OAuth Setup

| Setting | Location |
|---------|---------|
| Authorized redirect URIs | Google Cloud Console → OAuth 2.0 → Authorized redirect URIs |
| Required URI | `https://[PROJECT-REF].supabase.co/auth/v1/callback` |
| Metups site URI | Add `https://metups.com` to allowed origins |

---

## Local Development Setup

For local development, update `src/shared/supabase.js` with your development project credentials:

```javascript
// Development only — replace with your dev project credentials
const SUPABASE_URL      = 'https://YOUR-DEV-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-DEV-ANON-KEY';
```

**Never commit development credentials that differ from production to the main branch.**

---

## Secret Rotation Checklist

When rotating credentials:
- [ ] Generate new key in Supabase / Google Console
- [ ] Update in Supabase Auth settings (for OAuth)
- [ ] Test authentication flow in staging
- [ ] Deploy to production
- [ ] Verify production auth works
- [ ] Revoke old key
- [ ] Update secure documentation (team password manager)
- [ ] Log rotation in security audit trail
