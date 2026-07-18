# Incident Response Plan

| Field | Value |
|-------|-------|
| **Document ID** | SEC-004 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Security Lead |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / CTO] |
| **Classification** | Internal — Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Security Team] | Initial release |

---

## 1. Purpose

This plan defines how Metups detects, contains, investigates, and recovers from security incidents. It ensures a coordinated, timely response that minimises impact on users and the business.

---

## 2. Incident Severity Levels

| Level | Severity | Description | Examples |
|-------|---------|-------------|---------|
| P1 | Critical | Active compromise, data breach, or service down | Database breach, admin account takeover, complete service outage |
| P2 | High | Significant threat or partial service impact | Partial data exposure, elevated fraud, major feature down |
| P3 | Medium | Contained threat or minor impact | Single account compromised, isolated vulnerability identified |
| P4 | Low | Potential threat, no confirmed impact | Suspicious activity, minor anomaly |

---

## 3. Incident Response Team

| Role | Responsibility | Primary Contact |
|------|---------------|----------------|
| Incident Commander | Coordinates response | [CTO] |
| Security Lead | Technical investigation | [SECURITY LEAD] |
| Engineering Lead | Containment and remediation | [LEAD ENGINEER] |
| Communications Lead | Internal/external comms | [CEO / COO] |
| Legal/Compliance | Regulatory notifications | [LEGAL COUNSEL] |
| Customer Support Lead | User communications | [CX MANAGER] |

**Security Hotline:** [INTERNAL PHONE NUMBER]  
**Incident Email:** security@metups.com

---

## 4. Incident Response Phases

### Phase 1: Detection and Identification

**Triggers:**
- Automated alert from Supabase or monitoring tool
- User report via trust@metups.com
- External researcher disclosure
- Staff observation

**Actions:**
- [ ] Log incident with timestamp, source, and initial description
- [ ] Assign severity level (P1–P4)
- [ ] Page Incident Commander if P1 or P2
- [ ] Open incident channel (#incident-YYYY-MM-DD in [SLACK/TEAMS])

**Decision: Is this a real incident?**
- Confirmed → proceed to Containment
- False positive → document and close

---

### Phase 2: Containment

**P1/P2 — Immediate containment (within 1 hour):**
- [ ] Identify and isolate affected systems/accounts
- [ ] Revoke compromised credentials or tokens in Supabase Auth
- [ ] Block malicious IP addresses via Cloudflare WAF (if applicable)
- [ ] Disable affected features if necessary to prevent further harm
- [ ] Preserve logs and evidence (do NOT delete/overwrite)
- [ ] Notify Legal of potential regulatory obligation

**P3/P4 — Controlled containment (within 24 hours):**
- [ ] Apply targeted controls without service disruption
- [ ] Monitor for escalation

---

### Phase 3: Investigation

- [ ] Determine: What happened? How? When? Who/what was affected?
- [ ] Pull relevant Supabase logs (auth events, database queries, storage access)
- [ ] Pull Cloudflare access logs
- [ ] Identify entry vector, lateral movement, and data accessed/exfiltrated
- [ ] Determine scope of affected users/data
- [ ] Document findings in incident log

---

### Phase 4: Eradication

- [ ] Remove attacker access (revoke tokens, disable accounts, block IPs)
- [ ] Patch or remediate the vulnerability exploited
- [ ] Verify no backdoors or persistent access remain
- [ ] Review and harden related controls

---

### Phase 5: Recovery

- [ ] Restore services from clean state (see [Backup and Recovery Policy](backup-recovery-policy.md))
- [ ] Verify integrity of data before bringing services back online
- [ ] Monitor closely for 72 hours post-recovery
- [ ] Gradually re-enable affected features with enhanced monitoring

---

### Phase 6: Post-Incident Review

Within 5 business days of resolution:
- [ ] Complete Post-Incident Report (template below)
- [ ] Root cause analysis
- [ ] Timeline reconstruction
- [ ] Lessons learned
- [ ] Action items to prevent recurrence
- [ ] Update this plan if gaps identified

---

## 5. Communication Procedures

### Internal Communication
- Incident channel in Slack/Teams for real-time coordination
- Status updates every 30 minutes during P1, every 2 hours during P2
- All-hands update from CEO for P1 incidents

### User Communication (Data Breach)
- See [Data Breach Response Procedure](data-breach-response.md)
- Notification within 72 hours of confirmed breach (GDPR)
- Plain language, factual, no speculation

### Regulator Communication
- See [Data Breach Response Procedure](data-breach-response.md)
- GDPR supervisory authority: within 72 hours
- POPIA Information Regulator: as required

### Media Communication
- All media enquiries: press@metups.com
- CEO and Legal Counsel must approve any public statements

---

## 6. Post-Incident Report Template

```
INCIDENT REPORT
Reference: INC-[YYYY]-[NNN]
Date: [DATE]
Severity: [P1/P2/P3/P4]
Status: [Open / Contained / Resolved / Closed]

Summary:
[2-3 sentence executive summary]

Timeline:
[Detected → Contained → Resolved — with timestamps]

Root Cause:
[Technical explanation of how the incident occurred]

Impact:
- Users affected: [NUMBER or 'None confirmed']
- Data affected: [Categories and volume]
- Service downtime: [DURATION]

Actions Taken:
[What was done to contain, eradicate, and recover]

Lessons Learned:
[What worked well, what didn't, what to improve]

Action Items:
| Action | Owner | Due Date |
|--------|-------|----------|
| ...    | ...   | ...      |
```

---

## 7. Contact Directory

| Contact | Details |
|---------|---------|
| Supabase Support | support.supabase.com |
| Cloudflare Support | support.cloudflare.com |
| Cyber Insurance (if applicable) | [INSURER / POLICY NUMBER] |
| Legal Counsel | [LAW FIRM / DIRECT LINE] |
| Zimbabwe CERT | [CONTACT IF AVAILABLE] |
