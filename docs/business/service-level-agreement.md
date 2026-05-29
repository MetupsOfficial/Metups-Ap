# Service Level Agreement (SLA)

| Field | Value |
|-------|-------|
| **Document ID** | BIZ-001 |
| **Version** | 1.0.0 |
| **Owner** | Operations / Legal |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2027-05-29 |
| **Approved By** | [CEO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Operations] | Initial SLA |

---

## Parties

**Service Provider:** [COMPANY LEGAL NAME] trading as Metups ("Metups")  
**Customer:** All registered users of the Metups platform

*This SLA applies to all users of metups.com and constitutes part of the Terms of Service.*

---

## 1. Service Description

Metups provides an online marketplace platform enabling users to list, discover, and arrange the sale of pre-owned goods via metups.com and the Metups PWA.

---

## 2. Service Availability

| Service Component | Target Uptime | Measurement |
|------------------|--------------|-------------|
| Platform (metups.com) | 99.5% monthly | 24/7 external monitoring |
| Authentication (Supabase Auth) | 99.5% monthly | Supabase SLA |
| Listing API | 99.5% monthly | Supabase SLA |
| Real-time messaging | 99.0% monthly | Supabase Realtime SLA |
| File storage | 99.5% monthly | Supabase Storage SLA |

**Uptime Calculation:**
Uptime % = ((Total minutes - Downtime minutes) / Total minutes) × 100

**Exclusions from downtime calculation:**
- Scheduled maintenance (with 48-hour notice)
- Third-party provider outages (Supabase, Netlify) beyond Metups' control
- Force majeure events (internet infrastructure failures, etc.)

---

## 3. Support Response Times

| Priority | Criteria | First Response Target |
|---------|---------|----------------------|
| P1 — Critical | Service down, security breach | 2 hours (business hours) |
| P2 — High | Core feature broken, account suspended | 4 hours (business hours) |
| P3 — Medium | Non-critical feature issue | 8 hours (business hours) |
| P4 — Low | General enquiry | 24 hours (business hours) |

**Business hours:** Monday–Friday, 08:00–17:00 Central Africa Time (CAT)

---

## 4. Scheduled Maintenance

- Scheduled maintenance windows: Sundays 02:00–06:00 CAT
- Minimum notice: 48 hours via email and in-app banner
- Emergency maintenance: minimum 2-hour notice where feasible

---

## 5. Service Credits (Future Premium Plans)

For paid plans (when introduced):

| Monthly Uptime | Service Credit |
|---------------|---------------|
| 99.0%–99.5% | 10% of monthly fee |
| 95.0%–99.0% | 25% of monthly fee |
| < 95.0% | 50% of monthly fee |

Credits are applied to the next billing period. Credits are the sole remedy for SLA breaches.

---

## 6. Reporting and Transparency

- Status page: status.metups.com (to be established)
- Incident reports: Published within 5 business days of significant incidents
- Monthly uptime reports: Available on request

---

## 7. SLA Exclusions

This SLA does not cover:
- Issues caused by the user's device, browser, or internet connection
- Issues caused by third-party services outside Metups' control
- Scheduled maintenance periods
- Issues resulting from the user's violation of the Terms of Service
- Beta or experimental features clearly marked as such

---

## 8. Escalation

SLA complaints escalate to: operations@metups.com  
Response: within 5 business days
