# CI/CD Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-011 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial documentation |

---

## Current CI/CD Setup

Metups uses **Cloudflare's built-in CD** (Continuous Deployment) triggered by Git pushes.

```
Developer → Git Push → GitHub → Cloudflare Webhook → Deploy
```

There is no build step, so deployments are near-instant (~30–60 seconds from push to live).

---

## Deployment Pipeline

### Production
| Trigger | Branch | Target | Auto? |
|---------|--------|--------|-------|
| Push to `main` | main | production (metups.com) | Yes |
| Manual via CLI | any | production | Manual |

### Staging / Preview
| Trigger | Branch | Target | Auto? |
|---------|--------|--------|-------|
| Pull Request opened | any | Preview URL | Yes |
| Push to `staging` | staging | staging.metups.com | Yes |

---

## Cloudflare CD Configuration

In Cloudflare Dashboard → Site Settings → Build & Deploy:

| Setting | Value |
|---------|-------|
| Repository | github.com/[ORG]/Metups-Ap |
| Production branch | main |
| Base directory | (root) |
| Publish directory | src |
| Build command | (empty) |
| Deploy previews | Enabled for all PRs |
| Branch deploys | staging branch |

---

## Future CI Improvements (Recommended)

### GitHub Actions — Pre-deployment Checks

Create `.github/workflows/quality.yml` to run on every PR:

```yaml
name: Quality Check

on:
  pull_request:
    branches: [main, staging]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: HTML validation
        run: npx html-validate frontend/**/*.html
      - name: CSS lint
        run: npx stylelint frontend/assets/**/*.css
      - name: JS lint
        run: npx eslint frontend/**/*.js
      - name: Security headers check
        run: # validate wrangler.jsonc headers
      - name: Dependency audit
        run: npm audit --audit-level=high
```

### Recommended Additional Checks
- [ ] HTML validation (`html-validate`)
- [ ] CSS linting (`stylelint`)
- [ ] JS linting (`eslint`)
- [ ] Security header validation
- [ ] Dependency vulnerability scan (`npm audit`)
- [ ] Image optimisation check
- [ ] Dead link check

---

## Deploy Notifications

Configure Cloudflare to send deploy notifications to team:
- Cloudflare → Site → Settings → Build & Deploy → Deploy Notifications
- Notify Slack `#deployments` channel on: deploy started, succeeded, failed

---

## Branching Strategy

See [Branching Strategy](../team/branching-strategy.md) for full details.

```
main ──────────────────── production
  └── staging ──────────── staging environment
       └── feature/* ─── dev / PR previews
```

---

## Monitoring Post-Deploy

After each production deployment:
1. Cloudflare dashboard shows deploy status
2. Check Cloudflare deploy log for warnings
3. Run post-deployment verification checklist (see [Deployment Guide](deployment-guide.md))
4. Monitor Supabase Auth logs for anomalies for 30 minutes post-deploy
