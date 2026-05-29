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

Metups is deployed as a **static web application** to **Netlify**. There is no build step — the `src/` directory is published directly.

**Production URL:** https://metups.com  
**Staging URL:** https://[STAGING-SLUG].netlify.app  
**Netlify Team:** [NETLIFY TEAM NAME]  

---

## Deployment Prerequisites

- [ ] Git repository access (GitHub)
- [ ] Netlify account with access to the Metups site
- [ ] Netlify CLI installed: `npm install -g netlify-cli`
- [ ] Authenticated: `netlify login`

---

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

Connected to GitHub `main` branch. Every push to `main` automatically deploys to production.

```
Push to main → GitHub webhook → Netlify build → Deploy to CDN
```

**To deploy:**
```bash
git add .
git commit -m "feat: your change description"
git push origin main
```

Monitor deployment at: app.netlify.com → Deploys

---

### Method 2: Netlify CLI (Manual)

Use for urgent hotfixes or when bypassing CI is needed.

```bash
# Deploy to production
netlify deploy --prod --dir=src

# Deploy preview (staging)
netlify deploy --dir=src
```

---

### Method 3: Drag-and-Drop (Emergency)

For emergency deployments without CLI access:
1. Open app.netlify.com
2. Navigate to Metups site → Deploys
3. Drag the `src/` folder into the deploy drop zone

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
- [ ] `netlify.toml` headers correct

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
- [ ] Check Netlify deploy logs for warnings
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
# Via Netlify dashboard
app.netlify.com → Deploys → Click previous deploy → "Publish deploy"

# Via CLI
netlify deploy --prod --dir=src  # after git revert
```
