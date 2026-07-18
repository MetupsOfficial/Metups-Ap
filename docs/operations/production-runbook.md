# Production Runbook

| Field | Value |
|-------|-------|
| **Document ID** | OPS-002 |
| **Version** | 1.0.0 |
| **Owner** | Engineering / Operations |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |
| **Classification** | Internal |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial runbook |

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| On-call Engineer | [NAME] | [PHONE] |
| CTO | [NAME] | [PHONE] |
| CEO | [NAME] | [PHONE] |
| Supabase Support | — | support.supabase.com |
| Cloudflare Support | — | support.cloudflare.com |

---

## Quick Status Checks

```
Platform status:    https://metups.com
Supabase status:    https://status.supabase.com
Cloudflare status:     https://www.cloudflarestatus.com
Supabase dashboard: https://app.supabase.com
Cloudflare dashboard:  https://dash.cloudflare.com
```

---

## Common Operations

### Check if Platform is Up
1. Visit https://metups.com
2. Attempt to sign in with test account
3. Browse listings — confirm data loads
4. Check browser console for errors

### Force Cache Refresh for Users
If users are seeing stale content:
1. Increment cache version in `sw.js`
2. Deploy
3. Users' PWA will update on next visit

### View Recent Auth Events
1. Supabase dashboard → Authentication → Users
2. Review recent sign-ins and failures

### View Database Activity
1. Supabase dashboard → Database → Query Editor
2. Run: `SELECT * FROM products ORDER BY created_at DESC LIMIT 10;`

---

## Responding to Alerts

### Alert: Platform Down (404 or blank page)
1. Check Cloudflare status — is Cloudflare down?
2. If Cloudflare up: check deploy history for recent bad deploy
3. If bad deploy: roll back (see [Rollback Guide](../technical/rollback-guide.md))
4. If Cloudflare down: post status update; wait

### Alert: Authentication Broken
1. Check Supabase status
2. Try sign-in in incognito window
3. Check Supabase Auth logs for errors
4. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in source code are correct
5. Check if Google OAuth redirect URIs are still correctly configured

### Alert: High Error Rate
1. Check Supabase logs for PostgreSQL errors
2. Check Cloudflare function logs (if any)
3. Review recent deploys — did this start after a deploy?
4. Check browser console errors on live site
5. If related to deploy → rollback

### Alert: Spam / Fake Listings
1. Log into Supabase → Database → Table Editor → `products`
2. Filter by `created_at DESC` — identify bulk spam
3. Mark listings `is_active = false` in bulk:
   ```sql
   UPDATE products SET is_active = false WHERE seller_id = '[SPAM_USER_ID]';
   ```
4. Disable user account: Supabase → Auth → Users → Disable user
5. Log incident and consider IP block via Cloudflare

### Alert: Unusual Auth Activity (Brute Force)
1. Supabase → Auth → Logs → filter for failed logins
2. Identify source IP
3. Supabase rate limiting should handle this automatically
4. If persistent: block IP via Cloudflare WAF or Supabase Network Restrictions

---

## Routine Operations

### Weekly Health Check
- [ ] Visit metups.com and test core flows
- [ ] Check Supabase dashboard for error spikes
- [ ] Review new user signups
- [ ] Check storage usage (Supabase → Storage)
- [ ] Review open support tickets

### Monthly Operations
- [ ] Review Supabase plan usage (database size, bandwidth)
- [ ] Review Cloudflare bandwidth usage
- [ ] Run dependency vulnerability check
- [ ] Review and close old/stale listings (>6 months with no activity)
- [ ] Generate monthly metrics report

---

## Database Maintenance

### Cleanup Inactive Listings
```sql
-- Soft-delete listings inactive for 1 year with no buyer interest
UPDATE products
SET is_active = false
WHERE created_at < NOW() - INTERVAL '1 year'
  AND sold = false
  AND is_active = true;
```

### Cleanup Deleted User Data
```sql
-- Verify orphan records (should be none due to CASCADE)
SELECT COUNT(*) FROM products WHERE seller_id NOT IN (SELECT id FROM profiles);
```

---

## Escalation Path

```
Issue detected
    ↓
On-call engineer investigates (30 min)
    ↓ if unresolved
CTO engaged
    ↓ if unresolved
External support (Supabase / Cloudflare)
    ↓ if business impact
CEO notified
```
