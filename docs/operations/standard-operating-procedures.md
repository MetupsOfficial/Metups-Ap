# Standard Operating Procedures (SOPs)

| Field | Value |
|-------|-------|
| **Document ID** | OPS-001 |
| **Version** | 1.0.0 |
| **Owner** | Operations / CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / COO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Operations] | Initial SOPs |

---

## SOP Index

| SOP ID | Title | Owner |
|--------|-------|-------|
| SOP-001 | User Report Handling | Trust & Safety |
| SOP-002 | Account Suspension | Trust & Safety |
| SOP-003 | Production Deployment | Engineering |
| SOP-004 | New Team Member Onboarding | HR/Engineering |
| SOP-005 | Security Incident Response | Security/Engineering |
| SOP-006 | Content Moderation | Trust & Safety |
| SOP-007 | Customer Escalation Handling | CX |

---

## SOP-001: User Report Handling

**Trigger:** Report received via in-app report button or trust@metups.com  
**Owner:** Trust & Safety  
**SLA:** Review within 24 hours; action within 48 hours

### Steps
1. [ ] Receive report notification / email
2. [ ] Log in support ticket system with reference number
3. [ ] Categorise: spam / fraud / prohibited item / harassment / other
4. [ ] Review reported content in Supabase admin
5. [ ] Assess severity: does content violate AUP?
   - **No violation:** close ticket, record decision
   - **Possible violation:** escalate to second reviewer
   - **Clear violation:** proceed to action
6. [ ] Take action: warn / remove content / suspend account
7. [ ] Notify reporter of outcome (generic response — do not reveal user details)
8. [ ] Log action in moderation log

---

## SOP-002: Account Suspension

**Trigger:** Policy violation confirmed by moderation  
**Owner:** Trust & Safety  
**Authority required:** T&S Lead for first suspension; CTO for permanent ban

### Steps
1. [ ] Confirm violation with evidence documented
2. [ ] Determine suspension type: temporary (7/30 days) or permanent
3. [ ] In Supabase → Auth → Users → find user → Disable user
4. [ ] Send suspension notification email to user:
   - Reason (general category, not full details)
   - Duration
   - Appeals process: appeals@metups.com within 14 days
5. [ ] Deactivate listings if harmful content: `UPDATE products SET is_active=false WHERE seller_id='[ID]'`
6. [ ] Log in moderation log with: user_id, violation, evidence, action, date, agent

---

## SOP-003: Production Deployment

See [Deployment Guide](../technical/deployment-guide.md) for full procedure.

**Summary:**
1. Code reviewed and approved
2. Pre-deployment checklist completed
3. Push to main (or use Wrangler CLI)
4. Monitor for 30 minutes post-deploy
5. Post deployment notification to #deployments

---

## SOP-004: New Team Member Onboarding

See [Developer Onboarding Guide](../team/developer-onboarding.md).

**Summary:**
1. Email accounts created
2. System access provisioned (least privilege)
3. MFA enabled on all systems
4. Codebase walkthrough with senior engineer
5. Security policy training
6. First task assigned within week 1

---

## SOP-005: Security Incident Response

See [Incident Response Plan](../security/incident-response-plan.md).

---

## SOP-006: Content Moderation

**Scope:** Proactive review of flagged listings and reported users  
**Frequency:** Daily review queue

### Moderation Queue Process
1. Review all in-app reports from previous 24 hours
2. Review any listings auto-flagged by keyword filters (if implemented)
3. Apply AUP criteria (see [Acceptable Use Policy](../legal/acceptable-use-policy.md))
4. Log decisions
5. Brief Trust & Safety lead on patterns noticed

### Prohibited Keywords (Starter List)
Consider implementing keyword-based alert (not automated removal) for:
- Weapons: "gun", "pistol", "rifle", "ammo", "bullets"
- Drugs: common drug slang (maintain private list)
- Fraud indicators: "advance fee", "send first", "western union"

---

## SOP-007: Customer Escalation Handling

**Trigger:** Customer contacts support repeatedly, threatens legal action, or goes to social media  
**Owner:** CX Manager

### Steps
1. [ ] Acknowledge escalation and assign to CX Manager
2. [ ] Review full ticket history
3. [ ] Identify root cause and whether customer has a legitimate grievance
4. [ ] Legal threat? → Involve Legal Counsel immediately
5. [ ] Social media complaint? → Respond publicly within 4 hours; offer to resolve privately
6. [ ] Offer resolution: explanation / apology / account restoration / exception
7. [ ] Document outcome
8. [ ] Flag pattern for process improvement
