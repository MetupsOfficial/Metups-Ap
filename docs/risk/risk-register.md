# Risk Register

| Field | Value |
|-------|-------|
| **Document ID** | RISK-001 |
| **Version** | 1.0.0 |
| **Owner** | CEO / CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO] |
| **Classification** | Confidential — Internal |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Leadership] | Initial risk register |

---

## Risk Scoring Matrix

| Probability | Score | Likelihood |
|-------------|-------|-----------|
| Very Low | 1 | <5% chance in 12 months |
| Low | 2 | 5–20% |
| Medium | 3 | 20–50% |
| High | 4 | 50–80% |
| Very High | 5 | >80% |

| Impact | Score | Effect |
|--------|-------|--------|
| Negligible | 1 | Minimal disruption |
| Minor | 2 | Limited service impact |
| Moderate | 3 | Significant service or data impact |
| Major | 4 | Extended outage or significant data breach |
| Catastrophic | 5 | Platform shutdown, legal action, complete trust loss |

**Risk Score** = Probability × Impact  
**Rating:** 1–4 Low | 5–9 Medium | 10–16 High | 17–25 Critical

---

## Risk Register

### Technical Risks

| ID | Risk | Probability | Impact | Score | Rating | Owner | Mitigation |
|----|------|------------|--------|-------|--------|-------|-----------|
| RT-001 | Supabase service outage | 2 | 4 | 8 | Medium | CTO | Monitor status.supabase.com; DR plan documented |
| RT-002 | Netlify service outage | 1 | 4 | 4 | Low | CTO | Failover to Vercel/Cloudflare documented |
| RT-003 | Database corruption or data loss | 2 | 5 | 10 | High | CTO | Daily automated backups; PITR on Pro plan |
| RT-004 | Service Worker bug breaks PWA | 3 | 3 | 9 | Medium | Engineering | Test SW changes; cache versioning; easy rollback |
| RT-005 | Dependency (Supabase JS) security vulnerability | 2 | 3 | 6 | Medium | Engineering | Self-hosted; monitor advisories; update quarterly |
| RT-006 | GitHub repository compromised | 1 | 4 | 4 | Low | CTO | MFA on all accounts; branch protection rules |

### Security Risks

| ID | Risk | Probability | Impact | Score | Rating | Owner | Mitigation |
|----|------|------------|--------|-------|--------|-------|-----------|
| RS-001 | User account takeover (credential stuffing) | 3 | 3 | 9 | Medium | CTO | Supabase rate limiting; MFA option for users |
| RS-002 | XSS via malicious listing content | 2 | 4 | 8 | Medium | Engineering | Use textContent not innerHTML; CSP headers |
| RS-003 | Supabase credentials exposed in code | 1 | 5 | 5 | Medium | CTO | Code review; .gitignore; anon key is public anyway |
| RS-004 | Service role key leaked | 1 | 5 | 5 | Medium | CTO | Never in code; stored only in Supabase dashboard |
| RS-005 | Data breach via RLS misconfiguration | 2 | 5 | 10 | High | Engineering | RLS review quarterly; test with unprivileged user |
| RS-006 | Insider threat (team member misuses access) | 1 | 4 | 4 | Low | CTO | Least privilege; access logging; offboarding procedure |

### Business Risks

| ID | Risk | Probability | Impact | Score | Rating | Owner | Mitigation |
|----|------|------------|--------|-------|--------|-------|-----------|
| RB-001 | Slow user growth | 3 | 3 | 9 | Medium | CEO | Marketing strategy; referral programme |
| RB-002 | Competitor enters Zimbabwe market | 3 | 3 | 9 | Medium | CEO | Speed to scale; community trust; network effects |
| RB-003 | Key person dependency (founder-only knowledge) | 4 | 4 | 16 | High | CEO | Document everything; cross-training |
| RB-004 | Platform used for large-scale fraud | 3 | 4 | 12 | High | Trust & Safety | Active moderation; reporting; identity verification |
| RB-005 | Regulatory change (data protection) | 2 | 3 | 6 | Medium | Legal | Monitor Zimbabwean Data Protection Act developments |
| RB-006 | Internet infrastructure disruption (ZESA/ISP) | 4 | 3 | 12 | High | Product | Offline PWA mode; lightweight pages |

### Compliance Risks

| ID | Risk | Probability | Impact | Score | Rating | Owner | Mitigation |
|----|------|------------|--------|-------|--------|-------|-----------|
| RC-001 | GDPR enforcement action | 1 | 4 | 4 | Low | Legal | GDPR compliance statement; DPA with processors |
| RC-002 | POPIA non-compliance | 2 | 3 | 6 | Medium | Legal | POPIA compliance statement; Information Officer |
| RC-003 | IP infringement claim | 2 | 3 | 6 | Medium | Legal | Rapid response procedure; DMCA/takedown process |
| RC-004 | User data subpoena | 2 | 2 | 4 | Low | Legal | Legal team contacts; data minimisation |

---

## Risk Treatment Summary

| Rating | Treatment Approach |
|--------|-------------------|
| Critical (17–25) | Immediate action required |
| High (10–16) | Mitigation plan required within 30 days |
| Medium (5–9) | Mitigation plan within 90 days |
| Low (1–4) | Accept; review quarterly |

---

## Top Priority Actions

| Risk ID | Action | Due Date | Owner |
|---------|--------|---------|-------|
| RB-003 | Document all undocumented system knowledge | 2026-06-30 | CEO/CTO |
| RT-003 | Upgrade to Supabase Pro for PITR backups | 2026-06-30 | CTO |
| RS-005 | Complete RLS policy audit | 2026-06-30 | Engineering |
| RB-004 | Implement active moderation process | 2026-07-31 | Trust & Safety |
