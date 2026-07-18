# Business Continuity Plan

| Field | Value |
|-------|-------|
| **Document ID** | OPS-007 |
| **Version** | 1.0.0 |
| **Owner** | CEO / CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2027-05-29 |
| **Approved By** | [CEO] |
| **Classification** | Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Leadership] | Initial BCP |

---

## 1. Purpose

This plan ensures Metups can continue essential operations during and after a significant disruptive event. It covers people, technology, and communication continuity.

---

## 2. Business Impact Analysis

### Critical Functions

| Function | Criticality | RTO | Dependencies |
|---------|------------|-----|-------------|
| Platform availability | Critical | 4 hours | Cloudflare, Supabase |
| User authentication | Critical | 4 hours | Supabase Auth |
| Listing display | High | 4 hours | Supabase DB |
| In-app messaging | High | 8 hours | Supabase Realtime |
| Customer support | High | 8 hours | Email, team availability |
| Trust & Safety moderation | High | 24 hours | Email, Supabase admin |

### Non-Critical Functions

| Function | Can Be Paused? | Duration |
|---------|--------------|---------|
| New feature development | Yes | Up to 4 weeks |
| Marketing activities | Yes | Up to 4 weeks |
| Analytics reporting | Yes | Up to 4 weeks |

---

## 3. Disruption Scenarios

### Scenario A: Key Person Unavailable

**Trigger:** CTO or founding engineer unavailable for >48 hours.

**Response:**
- All system credentials stored in team password manager (not only with individuals)
- Emergency runbook in this document sufficient for basic operations
- Cloudflare and Supabase require only dashboard access and a browser
- Designate backup person: [BACKUP NAME]

### Scenario B: All Technical Staff Unavailable

**Trigger:** Team unreachable for >24 hours.

**Response:**
- Platform continues running without intervention (static + managed backend)
- Trust & Safety: pause moderation; set auto-response on report emails
- Customer support: set auto-reply directing users to Help Center
- CEO handles urgent communications

### Scenario C: Technology Failure

See [Disaster Recovery Guide](../technical/disaster-recovery.md) for technical recovery.

### Scenario D: Internet / Power Disruption (Zimbabwe Context)

Metups users and staff in Zimbabwe may experience:
- ZESA load-shedding (scheduled power cuts)
- Internet outages (EcoCash, TelOne, mobile data)
- Bank/payment system disruptions

**Mitigation:**
- PWA offline mode allows users to browse cached listings
- Engineering team can work remotely from locations with power/internet
- Critical operations (support, moderation) can be performed via mobile data
- No on-premise infrastructure means no dependency on a single office's power

---

## 4. Communication Plan

### Internal Communication During Disruption

| Scenario | Primary Channel | Backup Channel |
|---------|----------------|----------------|
| Technical incident | Slack #incidents | WhatsApp group |
| Team unavailability | Email | WhatsApp |
| Extended outage | Video call | Phone |

**Emergency WhatsApp group:** [GROUP NAME — include CEO, CTO, CX Manager]

### External Communication

| Audience | Channel | Message |
|---------|---------|---------|
| Users | In-app banner, email, social media | "We're experiencing technical issues and are working to resolve them" |
| Press | press@metups.com | "No comment" until CEO approves statement |
| Regulators | Via Legal Counsel | As legally required |

---

## 5. Recovery Priorities

After any significant disruption, restore in this order:

1. Platform accessibility (Cloudflare)
2. Authentication (Supabase Auth)
3. Core marketplace (listing display + creation)
4. Messaging (Supabase Realtime)
5. Customer support operations
6. Trust & Safety moderation
7. Analytics and non-critical features

---

## 6. Key Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| CEO | [NAME] | [NUMBER] | [EMAIL] |
| CTO | [NAME] | [NUMBER] | [EMAIL] |
| CX Manager | [NAME] | [NUMBER] | [EMAIL] |
| Legal Counsel | [NAME] | [NUMBER] | [EMAIL] |
| Supabase Support | — | — | support.supabase.com |
| Cloudflare Support | — | — | support.cloudflare.com |

---

## 7. Plan Testing

| Test | Frequency | Last Tested | Next Due |
|------|-----------|-------------|---------|
| Tabletop exercise | Annually | [DATE] | [DATE] |
| Technical recovery drill | Annually | [DATE] | [DATE] |
| Communication tree test | Annually | [DATE] | [DATE] |
