# Branching Strategy

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-004 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Approved By** | [CTO] |

---

## Branch Model

Metups uses a simplified **GitHub Flow** — appropriate for a small team with continuous deployment.

```
main ─────────────────────────────────── Production
  ├── staging ──────────────────────── Staging (optional)
  └── feature/[name] ─────────────── Feature branches (PR → main)
      hotfix/[name] ──────────────── Hotfix branches (PR → main)
```

---

## Branch Definitions

### `main`
- Always deployable — this IS production
- No direct commits
- Merges via PR with at least 1 approved review
- Cloudflare deploys automatically on merge

### `staging` (optional)
- Pre-production integration testing
- Cloudflare deploys to staging.metups.com on push
- Merge to main when stable

### `feature/[name]`
- Short-lived branches for features and improvements
- Branched from `main`
- Merged back to `main` via PR
- Deleted after merge
- Naming: `feature/add-search-filters`, `feature/wishlist-ui`

### `hotfix/[name]`
- Emergency fixes for production issues
- Branched from `main`
- Merged directly to `main` via expedited PR
- Naming: `hotfix/fix-auth-redirect`, `hotfix/prevent-duplicate-messages`

---

## Workflow

### Standard Feature

```bash
# 1. Always start from an updated main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Develop and commit
git add frontend/features/[feature]/[file].js
git commit -m "feat: implement search filters"

# 4. Push and open PR
git push origin feature/your-feature-name
# → Open PR on GitHub against main

# 5. After PR approval and merge
git branch -d feature/your-feature-name
```

### Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/fix-description
# Make targeted fix
git commit -m "fix: prevent auth loop on mobile Safari"
git push origin hotfix/fix-description
# → Open PR → expedited review → merge
```

---

## Rules

- **No force-pushing to `main`** — ever
- **No self-merging to `main`** without review (except emergency hotfixes with CTO verbal approval)
- **Branch names** are lowercase with hyphens — no spaces or special characters
- **Keep branches short-lived** — feature branches should live days, not weeks
- **Delete merged branches** to keep the repository clean

---

## Protection Rules (Configure in GitHub)

Settings → Branches → Branch protection rules for `main`:

- [ ] Require pull request reviews before merging (1 reviewer minimum)
- [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require status checks to pass before merging (when CI is set up)
- [ ] Do not allow bypassing the above settings
- [ ] Restrict who can push to matching branches (admins only)
