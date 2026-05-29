# Data Breach Response Procedure

| Field | Value |
|-------|-------|
| **Document ID** | SEC-005 |
| **Version** | 1.0.0 |
| **Owner** | CTO / DPO / Legal |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / DPO] |
| **Classification** | Internal — Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Security/Legal] | Initial release |

---

## 1. What Constitutes a Personal Data Breach

A personal data breach means a security incident resulting in the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data.

**Examples:**
- Supabase database accessed by an unauthorised party
- User data exfiltrated via an API vulnerability
- Staff member accidentally sharing user data with wrong recipient
- Ransomware encrypting user data
- Service role key exposed in public repository

---

## 2. 72-Hour Notification Clock

Under GDPR (Art. 33), Metups must notify the relevant supervisory authority **within 72 hours** of becoming **aware** of a breach, where feasible. The clock starts when a staff member with incident response authority is notified, not when the breach occurred.

**POPIA** requires notification to the Information Regulator and affected data subjects "as soon as reasonably possible."

---

## 3. Decision Tree

```
Is personal data involved?
    NO → Treat as security incident (see Incident Response Plan)
    YES ↓
Is there a risk to individuals' rights and freedoms?
    NO → Document internally only; no regulator notification required
    YES ↓
Notify supervisory authority within 72 hours
    ↓
Is there HIGH risk to individuals?
    NO → No user notification required (but good practice to notify)
    YES → Notify affected users without undue delay
```

---

## 4. Breach Response Steps

### Hour 0–2: Immediate Actions
- [ ] Confirm breach scope and contain (see [Incident Response Plan](incident-response-plan.md))
- [ ] Notify Incident Commander and DPO immediately
- [ ] Start 72-hour regulatory clock
- [ ] Preserve all evidence — do not delete logs
- [ ] Open breach log with timestamp

### Hour 2–24: Investigation
- [ ] Determine: data categories affected, volume of records, individuals affected
- [ ] Determine: likely consequences for affected individuals
- [ ] Assess risk level (low / medium / high)
- [ ] Legal counsel informed and engaged
- [ ] Draft regulator notification (even if incomplete)

### Hour 24–72: Notification Decision
- [ ] DPO and Legal finalise risk assessment
- [ ] Decide: notify regulator? notify users?
- [ ] If notifying regulator: submit notification using template below
- [ ] If notifying users: draft user communication for CEO and Legal approval

### Hour 72+: User Notification (if required)
- [ ] Send user notification email (see template)
- [ ] Post notice on platform (for high-risk breaches)
- [ ] Set up dedicated support channel for affected users
- [ ] Monitor for media enquiries

---

## 5. Regulatory Notification Content (GDPR Art. 33)

The notification must include:
- Nature of the breach (categories and approximate number of individuals and records)
- Contact details of DPO
- Likely consequences of the breach
- Measures taken or proposed to address the breach

**GDPR Supervisory Authority (EU):** [RELEVANT NATIONAL DPA]  
**ICO (UK):** ico.org.uk/make-a-complaint/data-security-incidents  
**Information Regulator (South Africa):** inforeg@justice.gov.za

---

## 6. User Notification Template

```
Subject: Important Security Notice — Your Metups Account

Dear [User Name],

We are writing to inform you of a security incident affecting Metups.

WHAT HAPPENED
[Brief, plain-language description of the breach]

WHAT INFORMATION WAS INVOLVED
[Specific data categories — e.g., email addresses, names]

WHAT WE ARE DOING
[Steps taken to secure the platform]

WHAT YOU SHOULD DO
- Change your Metups password immediately
- [Any other specific actions]
- Be alert to suspicious emails or messages

We sincerely apologise for this incident. The security of your personal information 
is our top priority.

For questions, contact us at: security@metups.com

[CEO Name]
CEO, Metups
```

---

## 7. Post-Breach Actions

- [ ] Complete full post-incident report
- [ ] Remediate root cause
- [ ] Review and update security controls
- [ ] Brief team on lessons learned
- [ ] Review cyber insurance coverage
- [ ] Update breach register
- [ ] Regulatory follow-up within required timeframes

---

## 8. Breach Register

All breaches (including near-misses) must be recorded in the internal Breach Register:

| Field | Content |
|-------|---------|
| Reference | BR-[YYYY]-[NNN] |
| Date discovered | [DATE] |
| Date occurred (estimated) | [DATE] |
| Nature of breach | [DESCRIPTION] |
| Data categories | [CATEGORIES] |
| Records affected | [NUMBER] |
| Risk level | Low / Medium / High |
| Regulator notified | Yes / No / Date |
| Users notified | Yes / No / Date |
| Resolution date | [DATE] |
