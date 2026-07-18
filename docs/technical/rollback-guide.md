# Rollback Guide

| Field | Value |
|-------|-------|
| **Document ID** | TECH-008 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Approved By** | [CTO] |

---

## When to Roll Back

Roll back immediately if, after deployment:
- Authentication is broken for any users
- Listing creation or display is broken
- Chat is non-functional
- Critical JavaScript errors in console preventing app use
- Security vulnerability introduced
- Data corruption detected

**Decision authority:** Any engineer can initiate a rollback. No approval needed if user impact is confirmed.

---

## Application Rollback (Cloudflare)

### Option A — Cloudflare Dashboard (Fastest, ~2 minutes)

1. Open dash.cloudflare.com
2. Navigate to your Metups site
3. Click **Deploys** tab
4. Find the last known good deployment
5. Click the deploy → click **"Publish deploy"**
6. Confirm — Cloudflare redeploys the previous build instantly

### Option B — Git Revert + Redeploy (~5 minutes)

```bash
# Identify the commit to revert
git log --oneline -10

# Revert the bad commit
git revert [BAD_COMMIT_HASH]

# Push to trigger automatic deployment
git push origin main
```

---

## Database Rollback

Database rollbacks are **high risk** — never roll back without CTO approval.

### Scenario: Migration went wrong, data intact
```sql
-- Drop the new columns/tables added by the migration
ALTER TABLE products DROP COLUMN IF EXISTS new_column;
-- Reverse specific schema changes
```

### Scenario: Data corruption
1. Stop all writes (temporarily disable Supabase project via dashboard if needed)
2. Restore from Supabase backup (see [Backup and Recovery Policy](../security/backup-recovery-policy.md))
3. Verify data integrity before re-enabling
4. Communicate data loss window to affected users

---

## Service Worker Rollback

If PWA behaviour is broken after a SW update:

1. Deploy application rollback (above)
2. Users' SW will update on next page visit
3. For stuck users — advise them to clear site data:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files

---

## Post-Rollback Actions

- [ ] Confirm rollback successful (test auth + listing + chat)
- [ ] Notify team in #deployments channel
- [ ] Log incident (see [Incident Response Plan](../security/incident-response-plan.md))
- [ ] Root cause analysis before re-deploying the reverted change
- [ ] Update test checklist to catch this failure in future

---

## Rollback Communication Template

```
⚠️ ROLLBACK — [DATE TIME]
Issue: [BRIEF DESCRIPTION]
Rolled back to: [DEPLOY ID / COMMIT HASH]
Status: [Rollback successful / In progress]
User impact: [None / [X] users affected for [Y] minutes]
Next steps: [Fix in progress / RCA scheduled]
```
