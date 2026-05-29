# Code Review Guidelines

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-003 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial guidelines |

---

## Purpose

Code review catches bugs, improves quality, shares knowledge, and maintains security. Every PR merged to `main` must be reviewed.

---

## PR Author Responsibilities

### Before Opening a PR
- [ ] Self-review your own diff — would you approve this?
- [ ] Test the feature end-to-end on Chrome (Android) and Desktop
- [ ] Test on Safari (iOS) if the feature touches UI
- [ ] No console errors or warnings
- [ ] No hardcoded credentials, tokens, or sensitive data
- [ ] If DB changes: migration SQL included and tested
- [ ] If RLS changes: verified that policies work correctly (other users can't access)
- [ ] Commit messages follow convention (see below)

### PR Description Must Include
1. **What** — what changed
2. **Why** — the reason for the change (link to issue/ticket)
3. **How to test** — steps to verify the feature works
4. **Screenshots** — for any UI changes

### PR Size
- Keep PRs small and focused — one feature or fix per PR
- If a PR is >500 lines, consider splitting it
- Large PRs take longer to review and introduce more risk

---

## Reviewer Responsibilities

### Response Time
- Review within **1 business day** (2 for non-urgent PRs)
- If you can't review in time, reassign or communicate

### What to Check

**Correctness**
- [ ] Does the code do what the PR description says?
- [ ] Are there edge cases not handled?
- [ ] Are error states handled gracefully?

**Security**
- [ ] No sensitive data (API keys, passwords) in code
- [ ] User input is validated
- [ ] RLS policies are correct — users can't access others' data
- [ ] No new SQL injection vectors
- [ ] Security headers not weakened

**Data / Supabase**
- [ ] New DB columns have appropriate types and constraints
- [ ] Migrations are non-destructive (add, don't remove/rename without caution)
- [ ] RLS policies cover all operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] No service role key usage in client code

**Performance**
- [ ] New DB queries have appropriate indexes
- [ ] No N+1 queries (fetching inside a loop)
- [ ] Images are sized appropriately

**Code Quality**
- [ ] Code is readable without needing comments for the obvious
- [ ] No dead code
- [ ] Consistent with existing patterns in the codebase
- [ ] No unnecessary complexity

---

## Review Comment Conventions

Use prefixes to signal intent:

| Prefix | Meaning |
|--------|---------|
| `BLOCK:` | Must be resolved before merge |
| `SUGGEST:` | Suggestion, not mandatory |
| `NIT:` | Nit-pick, style preference — author's call |
| `QUESTION:` | Clarifying question, not necessarily a change |
| `PRAISE:` | Explicitly good code worth highlighting |

**Example:**
```
BLOCK: This query has no RLS check — a user could update another user's listing.
SUGGEST: Consider extracting this into a shared utility function.
NIT: `let` could be `const` here.
QUESTION: Is there a reason this uses `getUser()` instead of `getSession()`?
```

---

## Merge Criteria

A PR is ready to merge when:
- [ ] At least 1 approved review from a senior engineer or CTO
- [ ] All `BLOCK:` comments resolved
- [ ] Author has addressed or responded to all comments
- [ ] No merge conflicts
- [ ] Netlify deploy preview looks correct (for UI changes)

---

## Commit Message Convention

Follow Conventional Commits:

```
<type>: <description>

[optional body]
```

**Types:**
| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `security` | Security fix |
| `chore` | Maintenance, dependency updates |
| `docs` | Documentation only |
| `style` | CSS/formatting, no logic change |
| `refactor` | Refactoring without behaviour change |
| `perf` | Performance improvement |

**Examples:**
```
feat: add wishlist toggle to product listing card
fix: prevent duplicate conversation creation
security: force HTTPS redirect for HTTP connections
chore: update Supabase JS to v2.43.0
```
