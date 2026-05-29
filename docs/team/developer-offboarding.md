# Developer Offboarding Guide

| Field | Value |
|-------|-------|
| **Document ID** | TEAM-002 |
| **Version** | 1.0.0 |
| **Owner** | CTO / HR |
| **Last Reviewed** | 2026-05-29 |
| **Approved By** | [CTO / CEO] |
| **Classification** | Internal — Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [CTO] | Initial guide |

---

## Overview

This guide ensures departing team members are offboarded securely and all access is revoked. **Access revocation must be completed within 4 hours of the last working day.**

---

## Offboarding Checklist

### Before Last Day
- [ ] Knowledge transfer sessions scheduled (2–5 days before departure)
- [ ] In-progress work documented and handed over
- [ ] Open PRs either merged or closed
- [ ] Any unreleased features documented in tickets
- [ ] Personal project files moved to shared repository
- [ ] All company credentials in team password manager (not only on departing device)

### On Last Day
- [ ] Exit interview completed
- [ ] Company equipment returned (if applicable)

### Access Revocation (Within 4 Hours)

| System | Action | Owner |
|--------|--------|-------|
| Company email | Deactivate account | [IT / CEO] |
| GitHub | Remove from organisation | CTO |
| Supabase | Remove from project | CTO |
| Netlify | Remove from team | CTO |
| Password manager | Remove access | CTO |
| Slack/Teams | Deactivate | [IT / Manager] |
| Any other systems | List and revoke | CTO |

### Post-Departure
- [ ] Rotate any shared credentials the person had access to
- [ ] Review git log for any sensitive commits from departed member
- [ ] Review recent Supabase auth events for anomalies
- [ ] Redirect their email for 30 days (for legal/customer emails)
- [ ] Update team directory and documentation

---

## Knowledge Transfer Template

Before departure, the departing developer should document:

1. **Active projects:** What's in progress, current state, next steps
2. **Undocumented systems knowledge:** Anything not in the docs that's important
3. **Recurring tasks they owned:** What runs on a schedule, who should own it
4. **Key relationships:** Any external contacts they managed
5. **Unresolved issues:** Known bugs or technical debt to be aware of
6. **Passwords / credentials created by them:** Ensure in team password manager

---

## Security Notice

Departing team members must:
- Not retain copies of any Metups source code, data, or credentials
- Not retain access to any Metups systems after their last working day
- Return all company devices and materials
- Adhere to any confidentiality agreement signed during employment

Violations may result in legal action.
