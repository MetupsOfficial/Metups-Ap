# MCC Rollout Guide

## Purpose

This guide activates the Metups Control Center without removing the existing marketplace administration features.

## 1. Apply the database foundation

In Supabase Dashboard, open **SQL Editor** and run [`supabase/mcc_foundation.sql`](../../supabase/mcc_foundation.sql).

The script is additive and idempotent. It creates MCC records, intelligence tables, tags, decisions, attachments, private storage, and the admin-token RPCs used by the dashboard.

## 2. Configure the Cloudflare secret

The Worker needs a Supabase service-role key only to transfer MCC attachment files and create five-minute download links. Set it outside source control:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Paste the service-role key from Supabase when prompted. Do not use the anon key and never put this value in `src/`.

## 3. Deploy

```bash
wrangler deploy
```

Cloudflare serves the `src/` assets and the Worker retains the product-link Open Graph behavior previously handled by Cloudflare.

## 4. Verify

1. Sign in at `/admin/login.html`.
2. Open **Decision Journal**, create and edit a decision, then confirm the audit log records the action.
3. Open a department such as **Growth Department**, add a record and tags.
4. Edit that record, upload a permitted attachment (PDF, image, text, CSV, or XLSX), and download it again.
5. Search the record from the top-bar MCC search.

## Rollback

The marketplace remains independent of the new MCC tables. To roll back only the front end, deploy the previous Worker version in Cloudflare. Do not delete MCC database rows during an incident; access can be removed by revoking the new RPC grants while data is investigated.
