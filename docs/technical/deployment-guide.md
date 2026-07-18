# Deployment Guide

| Field | Value |
|-------|-------|
| **Document ID** | TECH-007 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial guide |

---

## Overview

Metups is deployed as a **static web application** to **Cloudflare Workers**. There is no build step — the `src/` directory is published directly. The Worker also adds server-rendered Open Graph tags to product links for social crawlers.

**Production URL:** https://metups.com  
**Staging URL:** Cloudflare Workers preview URL
**Cloudflare Account:** [CLOUDFLARE ACCOUNT NAME]

---

## Deployment Prerequisites

- [ ] Git repository access (GitHub)
- [ ] Cloudflare account with access to the Metups zone and Worker
- [ ] Wrangler installed: `npm install -g wrangler`
- [ ] Authenticated: `wrangler login`
- [ ] Configure the Worker secret for MCC file storage: `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`

The service-role key is used only inside the Cloudflare Worker to upload and sign private MCC attachments. Never place it in browser code or commit it to the repository.

---

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

Connected to GitHub `main` branch. Every push to `main` automatically deploys to production.

```
Push to main → Cloudflare build/deploy → Worker + CDN
```

**To deploy:**
```bash
git add .
git commit -m "feat: your change description"
git push origin main
```

Monitor deployment in the Cloudflare dashboard → Workers & Pages.

---

### Method 2: Wrangler CLI (Manual)

Use for urgent hotfixes or when bypassing CI is needed.

```bash
# Deploy to production
wrangler deploy

# Deploy preview (staging)
wrangler deploy --dry-run
```

---

---

## Pre-Deployment Checklist

Run before every production deployment:

- [ ] Code reviewed and approved (see [Code Review Guidelines](../team/code-review-guidelines.md))
- [ ] Tested on Chrome (Android + Desktop)
- [ ] Tested on Safari (iOS)
- [ ] Auth flow tested (sign in, sign up, password reset)
- [ ] Listing creation and viewing tested
- [ ] Chat functionality tested
- [ ] PWA install tested (if SW changes)
- [ ] No console errors in production build
- [ ] Supabase RLS policies verified if DB changes
- [ ] No sensitive data (API keys, secrets) in committed code
- [ ] `src/_headers` and `wrangler.jsonc` are correct

---

## Database Migrations

Database changes must be deployed **before** or alongside application changes:

1. Write migration SQL in `supabase/` directory
2. Test on development Supabase project
3. Review with CTO for RLS implications
4. Apply to production via Supabase SQL Editor
5. Verify data integrity after migration
6. Deploy application changes

**Never migrate production database without a backup point confirmed.**

---

## Post-Deployment Verification

Within 10 minutes of deployment:

- [ ] Verify production URL loads: https://metups.com
- [ ] Sign in with test account
- [ ] Create a test listing (then delete)
- [ ] Check browser console — no unexpected errors
- [ ] Verify PWA manifest loads
- [ ] Check Cloudflare deploy logs for warnings
- [ ] Confirm security headers: securityheaders.com/metups.com

---

## Deployment Notification

Notify team in [SLACK/TEAMS] channel `#deployments`:
```
🚀 Deployed to production
Version: [TAG or COMMIT HASH]
What changed: [BRIEF DESCRIPTION]
Deployed by: [YOUR NAME]
Rollback: git revert [COMMIT] if needed
```

---

## Service Worker Deployment Notes

When `sw.js` is modified:
- Increment the cache version constant in `sw.js`
- The new SW will activate on next page load after old clients close
- Consider adding a "New version available — refresh" notification to users
- Monitor for errors in the first hour post-deploy

---

## Rollback

See [Rollback Guide](rollback-guide.md) for full rollback procedures.

**Quick rollback:**
```bash
# Via Cloudflare dashboard
dash.cloudflare.com → Deploys → Click previous deploy → "Publish deploy"

# Via CLI
wrangler deploy  # after git revert
```
