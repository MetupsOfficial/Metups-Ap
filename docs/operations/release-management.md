# Release Management Process

| Field | Value |
|-------|-------|
| **Document ID** | OPS-005 |
| **Version** | 1.0.0 |
| **Owner** | Engineering / CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Release Cadence

| Release Type | Frequency | Scope |
|-------------|-----------|-------|
| Feature releases | Bi-weekly (sprints) | New features, improvements |
| Bug fixes | As needed | Confirmed bugs only |
| Security patches | Immediate | Critical/High vulnerabilities |
| Emergency hotfixes | Immediate | Production-breaking issues |

---

## Release Types

### Feature Release
1. **Planning** — features scoped in sprint planning
2. **Development** — feature branches per [Branching Strategy](../team/branching-strategy.md)
3. **Review** — PR opened, code reviewed per [Code Review Guidelines](../team/code-review-guidelines.md)
4. **Testing** — manual testing on staging branch / Cloudflare preview
5. **Approval** — CTO approves merge to main
6. **Deploy** — merge to main triggers automatic deploy
7. **Verification** — post-deploy checklist completed
8. **Release Notes** — published to [CHANGELOG / Release Notes page]

### Hotfix Release
1. **Branch** — `hotfix/description` off `main`
2. **Fix** — minimal change to address the issue
3. **Review** — expedited review by 1 senior engineer
4. **Deploy** — merge directly to main
5. **Backport** — cherry-pick to `staging` if applicable
6. **Post-mortem** — schedule root cause analysis

---

## Release Checklist

### Pre-release
- [ ] All features for this release complete and tested
- [ ] No open P1 or P2 bugs
- [ ] Code reviewed and approved
- [ ] Database migrations tested on staging
- [ ] Release notes drafted
- [ ] Changelog updated
- [ ] [Any customer-facing comms needed?]

### Deployment
- [ ] Merge to main (auto-deploy triggers)
- [ ] Monitor Cloudflare deploy log
- [ ] Deploy confirmed successful

### Post-release
- [ ] Post-deploy verification checklist (see [Deployment Guide](../technical/deployment-guide.md))
- [ ] Release notes published
- [ ] Team notified in #releases channel
- [ ] Changelog committed to repo

---

## Versioning

Metups uses **Semantic Versioning** (semver):
- `MAJOR.MINOR.PATCH` (e.g., `1.4.2`)
- **MAJOR:** Breaking changes or significant platform overhauls
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes, security patches

Version is tracked in `package.json` (when added) and git tags.

```bash
# Tag a release
git tag -a v1.4.0 -m "Release v1.4.0 — chat improvements"
git push origin v1.4.0
```

---

## Release Communication

| Audience | Channel | Timing |
|---------|---------|--------|
| Internal team | #releases Slack | On deploy |
| Users (significant features) | In-app notification / email | On deploy |
| Users (security patches) | Email (if user action required) | ASAP |
| Press | press@metups.com | Significant releases only |
