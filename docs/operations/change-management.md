# Change Management Process

| Field | Value |
|-------|-------|
| **Document ID** | OPS-006 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Operations |
| **Last Reviewed** | 2026-05-29 |
| **Approved By** | [CEO / CTO] |

---

## Change Categories

| Category | Risk | Approval Required | Notice Period |
|---------|------|-------------------|--------------|
| Standard change | Low | Team lead | None |
| Normal change | Medium | CTO | 48 hours |
| Emergency change | Any | CTO (verbal OK) | None (document after) |
| Major change | High | CEO + CTO | 7 days |

---

## Standard Changes (Pre-approved)

These changes can be made without additional approval:
- Bug fixes in non-critical code paths
- Copy/text updates
- CSS styling changes
- New listings of internal content
- Help Center article updates

---

## Normal Changes

Require CTO review and 48-hour planning window:
- New features
- Database schema additions (new columns, non-breaking)
- New dependencies
- Configuration changes (Netlify, Supabase settings)
- Third-party service integrations

**Process:**
1. Engineer opens PR with clear description
2. CTO reviews and approves
3. Deploy during business hours (Monday–Thursday preferred)
4. Post-deploy monitoring for 2 hours

---

## Major Changes

Require CEO + CTO approval with 7-day planning:
- Database schema changes that modify or remove existing columns
- Authentication system changes
- Pricing or business model changes
- Terms of Service or Privacy Policy changes
- Infrastructure platform migration
- Significant UI redesign

**Process:**
1. RFC (Request for Change) document prepared
2. Impact assessment completed
3. Rollback plan documented
4. User communication plan (if applicable)
5. CEO + CTO sign-off
6. Change implemented with enhanced monitoring

---

## Emergency Changes

For P1 incidents requiring immediate action:
1. Verbal/message approval from CTO
2. Change implemented
3. Full documentation completed within 24 hours
4. Post-incident review scheduled

---

## Change Log

All changes to be logged in git commit history. Major changes additionally logged here:

| Date | Change | Category | Approved By | Notes |
|------|--------|---------|------------|-------|
| 2026-05-29 | Initial production launch | Major | [CEO/CTO] | |
