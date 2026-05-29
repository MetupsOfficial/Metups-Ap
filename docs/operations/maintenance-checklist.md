# Maintenance Checklist

| Field | Value |
|-------|-------|
| **Document ID** | OPS-003 |
| **Version** | 1.0.0 |
| **Owner** | Engineering / Operations |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Daily Checklist

| Task | Owner | Status |
|------|-------|--------|
| Verify platform loads at metups.com | On-call | ☐ |
| Review new support tickets | CX | ☐ |
| Review in-app reports | Trust & Safety | ☐ |
| Check Supabase dashboard for errors | Engineering | ☐ |
| Monitor new user signups for anomalies | Engineering | ☐ |

---

## Weekly Checklist

| Task | Owner | Status |
|------|-------|--------|
| End-to-end smoke test (sign in, list, message, wishlist) | Engineering | ☐ |
| Review Netlify bandwidth and build logs | Engineering | ☐ |
| Review Supabase storage usage | Engineering | ☐ |
| Review and respond to all support tickets | CX | ☐ |
| Check for new Supabase / Netlify advisories | Engineering | ☐ |
| Review moderation log for patterns | Trust & Safety | ☐ |
| Send weekly internal metrics to team | Operations | ☐ |

---

## Monthly Checklist

| Task | Owner | Status |
|------|-------|--------|
| Review and update dependencies | Engineering | ☐ |
| Run `npm audit` (or equivalent) for vulnerabilities | Engineering | ☐ |
| Review Supabase RLS policies for correctness | Engineering | ☐ |
| Review access control list (who has access to what) | CTO | ☐ |
| Archive old/inactive listings (>1 year, unsold) | Engineering | ☐ |
| Review Help Center analytics — update top-searched articles | CX | ☐ |
| Generate monthly user metrics report | Operations | ☐ |
| Verify database backup is restorable | Engineering | ☐ |
| Review and close stale support tickets | CX | ☐ |
| Update privacy/legal docs if regulations changed | Legal | ☐ |

---

## Quarterly Checklist

| Task | Owner | Status |
|------|-------|--------|
| Full security review | Security Lead / CTO | ☐ |
| Access control audit (remove unused access) | CTO | ☐ |
| Review and update all SOPs | Operations | ☐ |
| Supabase plan review (usage vs. costs) | CTO | ☐ |
| Test disaster recovery procedure | Engineering | ☐ |
| Review SLA performance against targets | Operations | ☐ |
| Update risk register | [Risk Owner] | ☐ |
| Review all third-party services and contracts | CTO / Legal | ☐ |
| Performance review — page load times | Engineering | ☐ |
| PWA audit (Lighthouse score) | Engineering | ☐ |

---

## Annual Checklist

| Task | Owner | Status |
|------|-------|--------|
| Full penetration test (when >10,000 users) | External Vendor | ☐ |
| Privacy Policy and Terms of Service review | Legal | ☐ |
| DPA review with all processors | Legal | ☐ |
| Annual security training for all staff | Security Lead | ☐ |
| Disaster recovery full drill | Engineering | ☐ |
| Business continuity plan review | CEO / CTO | ☐ |
| Insurance review (cyber, liability) | CEO | ☐ |
| Rotate long-lived credentials | Security Lead | ☐ |
| Review and update Architecture Documentation | Engineering | ☐ |
| Domain and SSL certificate renewal check | Engineering | ☐ |
