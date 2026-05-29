# Disaster Recovery Guide

| Field | Value |
|-------|-------|
| **Document ID** | TECH-009 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / CTO] |
| **Classification** | Internal — Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial guide |

---

## 1. Recovery Objectives

| Objective | Target |
|-----------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 24 hours |
| Maximum Tolerated Downtime (MTD) | 8 hours |

---

## 2. Disaster Scenarios

### Scenario A: Netlify Outage (Hosting Down)

**Impact:** Platform inaccessible. Installed PWA users can browse cached content.  
**Recovery:**

1. Check Netlify status: netlifystatus.com
2. If Netlify outage: wait for recovery (typically <1 hour for CDN issues)
3. If outage >2 hours: activate emergency hosting

**Emergency hosting fallback:**
- Verify [BACKUP HOSTING — e.g., Vercel, GitHub Pages, Cloudflare Pages]
- `vercel deploy src/ --prod` or equivalent
- Update DNS CNAME record: `metups.com` → new host
- DNS TTL change takes 5–30 minutes (set TTL to 60s in advance for planned events)

---

### Scenario B: Supabase Outage (Backend Down)

**Impact:** Platform loads but no auth, no listings, no chat.  
**Recovery:**

1. Check Supabase status: status.supabase.com
2. Confirm it's a Supabase issue (not Metups code)
3. Post status update to metups.com/status (or social media)
4. Wait for Supabase recovery (SLA: 99.9%)
5. After recovery: verify all features operational

**If Supabase is permanently unavailable (extremely unlikely):**
- Export data from last backup
- Provision new Supabase project
- Restore database (see below)
- Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in code
- Redeploy

---

### Scenario C: Data Loss / Corruption

**Impact:** User data, listings, or messages corrupted or deleted.  
**Recovery:**

**Prerequisites:** Manual database export stored at [BACKUP LOCATION]

1. Assess scope — which tables, how many records, when did it occur?
2. Get CTO + CEO approval for restore
3. Notify Legal/DPO if user personal data affected
4. In Supabase Dashboard → Settings → Backups → Select restore point
5. Confirm restoration with test queries
6. Identify window of data loss
7. Communicate to affected users if significant data was lost

---

### Scenario D: Security Breach / Account Compromise

**Impact:** User data potentially accessed by unauthorised party.

See [Data Breach Response Procedure](../security/data-breach-response.md).

---

### Scenario E: GitHub Repository Lost or Corrupted

**Impact:** Cannot deploy new code.  
**Recovery:**

1. GitHub is a distributed system — local clones are valid copies
2. Any developer's local clone can re-push to a new repository
3. Netlify can re-link to a new repository
4. Source code is backed up in every developer's local environment

---

## 3. Full Environment Rebuild (Worst Case)

If ALL systems must be rebuilt from scratch:

### Step 1 — Recover Source Code
```bash
# From any developer's local clone
git remote add new-origin https://github.com/[ORG]/Metups-Ap-new.git
git push new-origin main
```

### Step 2 — Provision New Supabase Project
1. Create new project at app.supabase.com
2. Run: `supabase/metups_migration.sql`
3. Run: `supabase/fix_rls_and_policies.sql`
4. Configure Google OAuth (update redirect URI in Google Cloud Console)
5. Note new `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Step 3 — Restore Database
1. Import from backup SQL file: Supabase SQL Editor → paste and run
2. Verify row counts match expected

### Step 4 — Update Application Config
```javascript
// src/shared/supabase.js
const SUPABASE_URL      = 'https://NEW-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'NEW-ANON-KEY';
```

### Step 5 — Deploy to Netlify
1. Create new Netlify site linked to GitHub repository
2. Set publish directory to `src/`
3. Deploy
4. Verify production URL

### Step 6 — DNS Update
1. Update CNAME/A record to point to new Netlify URL
2. Re-enable HTTPS

### Step 7 — Verify
- [ ] Auth working
- [ ] Listings displaying
- [ ] Chat functional
- [ ] Images loading
- [ ] PWA installable

**Estimated RTO for full rebuild: 4–6 hours**

---

## 4. Communication During Disaster

| Audience | Channel | Responsible |
|---------|---------|-------------|
| Engineering team | Slack #incidents | CTO |
| All staff | Email all-hands | CEO |
| Users | Status page + social media | Communications Lead |
| Press/media | Official statement | CEO only |

**Status page:** [SET UP AT status.metups.com or statuspage.io]

---

## 5. Disaster Recovery Test

| Test | Frequency | Last Tested |
|------|-----------|-------------|
| Database restore from backup | Quarterly | [DATE] |
| Full environment rebuild drill | Annually | [DATE] |
| Netlify failover to backup host | Annually | [DATE] |
