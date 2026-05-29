# Engineering Standards

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-005 |
| **Version** | 1.0.0 |
| **Owner** | CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Core Engineering Values

1. **Reliability over features** — a feature that breaks is worse than no feature
2. **User safety first** — security decisions favour protecting users, not convenience
3. **Simplicity over sophistication** — the simplest solution that works is the best solution
4. **Make it reversible** — prefer decisions you can undo
5. **Own your work** — when you merge it, you own it until the next engineer takes over

---

## Development Practices

### Definition of Done
A feature is "done" when:
- [ ] Tested manually on Chrome Android and Desktop
- [ ] Tested on Safari iOS (for UI changes)
- [ ] No console errors on target pages
- [ ] PR reviewed and approved
- [ ] Post-deploy verification passed

### No Debugging Code in Production
Remove before merging:
- `console.log()` debugging statements (use `console.warn/error` for legitimate monitoring)
- Commented-out code
- TODO comments without linked tickets
- Test data in production database

### Breaking Changes Policy
- Never silently break existing functionality
- If a DB migration removes a column or renames a table — coordinate carefully
- Document breaking changes in PR description
- Communicate to team before deploying

---

## Tooling Standards

| Need | Tool |
|------|------|
| Code editor | VS Code (recommended) |
| Version control | Git + GitHub |
| Local server | Python `http.server` or `npx serve` |
| Database admin | Supabase Dashboard |
| API testing | Browser DevTools or Postman |
| Design reference | [Figma — if applicable] |

---

## On-Call Responsibilities

When on-call (rotation TBD):
- Available to respond to P1/P2 incidents within 30 minutes
- Monitor deployment notifications for post-deploy issues
- Escalate to CTO for anything requiring production DB changes or major decisions

---

## Documentation Standards

Every significant code change should be accompanied by:
- Updated docstring/comment if function behaviour changes
- Updated README if new setup steps are required
- Updated Architecture docs if design changes significantly
- Release notes entry for user-facing changes

---

## Technical Debt Policy

- Technical debt is documented in GitHub Issues with the `tech-debt` label
- Debt items are reviewed in quarterly planning
- No new technical debt is introduced knowingly without a plan to address it
- "Quick fixes" that create debt must have a linked issue for the proper fix

---

## Incident Learning Culture

- All P1/P2 incidents require a post-incident report
- Post-incident reviews are blameless — focus on process, not people
- Action items from post-mortems are tracked to completion
- Learnings are shared with the team, not siloed
