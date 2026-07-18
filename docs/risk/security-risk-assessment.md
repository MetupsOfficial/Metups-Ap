# Security Risk Assessment

| Field | Value |
|-------|-------|
| **Document ID** | RISK-003 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Security Lead |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |
| **Classification** | Confidential |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Security] | Initial assessment |

---

## 1. Threat Model

### Assets to Protect

| Asset | Sensitivity | If Compromised |
|-------|------------|----------------|
| User personal data (email, phone, location) | High | Privacy violation, regulatory fines |
| User account credentials | High | Account takeover, fraud |
| Private messages between users | High | Privacy violation |
| Supabase service role key | Critical | Full DB access, RLS bypass |
| Source code | Medium | Competitive harm, vulnerability exposure |
| Platform availability | High | User trust, business continuity |

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|-----------|
| Opportunistic script kiddies | Defacement, data theft | Low |
| Fraudsters (local) | Financial gain via scam | Medium |
| Competitor (unlikely) | Business disruption | Low |
| State actors (unlikely at current scale) | Surveillance | High |
| Insider threat | Data theft, sabotage | Medium |

---

## 2. OWASP Top 10 Assessment

| Risk | Status | Evidence |
|------|--------|---------|
| A01: Broken Access Control | ✅ Mitigated | Supabase RLS on all tables; tested |
| A02: Cryptographic Failures | ✅ Mitigated | HTTPS everywhere; Supabase handles hashing |
| A03: Injection | ✅ Mitigated | Supabase client uses parameterized queries |
| A04: Insecure Design | ⚠️ Partial | Security reviewed but no formal threat model per feature |
| A05: Security Misconfiguration | ✅ Mitigated | Security headers via wrangler.jsonc |
| A06: Vulnerable and Outdated Components | ⚠️ Partial | Dependencies self-hosted but manual update process |
| A07: Identification and Authentication Failures | ✅ Mitigated | Supabase Auth with PKCE; no custom auth |
| A08: Software and Data Integrity Failures | ✅ Mitigated | Dependencies self-hosted; code in Git |
| A09: Security Logging and Monitoring Failures | ⚠️ Partial | Supabase logs available; no centralised SIEM |
| A10: Server-Side Request Forgery (SSRF) | ✅ N/A | No server-side HTTP requests |

---

## 3. Key Risk Areas

### 3.1 RLS Policy Misconfiguration (HIGH)
**Risk:** A RLS policy error could expose user data to other users.
**Current controls:** RLS enabled on all tables; policies documented
**Gap:** No automated testing of RLS policies
**Action:** Implement test script that verifies RLS with unauthenticated and wrong-user requests

### 3.2 XSS via User Content (MEDIUM)
**Risk:** Malicious user embeds JavaScript in listing title/description.
**Current controls:** `textContent` used for rendering user content (not `innerHTML`)
**Gap:** Need to audit all places where `innerHTML` is used — ensure sanitised
**Action:** Audit codebase for `innerHTML` usage with user content

### 3.3 Monitoring Gaps (MEDIUM)
**Risk:** Security incidents go undetected due to limited monitoring.
**Current controls:** Supabase logs; Cloudflare logs
**Gap:** No automated alerting on suspicious patterns
**Action:** Set up UptimeRobot + basic auth anomaly alerts in Supabase

### 3.4 Account Takeover (MEDIUM)
**Risk:** Credential stuffing attacks on Metups accounts.
**Current controls:** Supabase built-in rate limiting
**Gap:** No MFA option for users; no breach notification for users
**Action:** Add optional MFA for users; integrate HaveIBeenPwned API on signup

---

## 4. Security Controls Inventory

| Control | Type | Status |
|---------|------|--------|
| HTTPS everywhere | Preventive | ✅ Active |
| X-Frame-Options: DENY | Preventive | ✅ Active |
| X-Content-Type-Options | Preventive | ✅ Active |
| Permissions-Policy | Preventive | ✅ Active |
| Referrer-Policy | Preventive | ✅ Active |
| Supabase RLS | Preventive | ✅ Active |
| PKCE OAuth flow | Preventive | ✅ Active |
| HTTP → HTTPS redirect | Preventive | ✅ Active |
| JWT session expiry | Preventive | ✅ Active (Supabase managed) |
| Input validation (DB constraints) | Preventive | ✅ Active |
| Error logging (Supabase) | Detective | ✅ Active |
| Uptime monitoring | Detective | ⚠️ Not yet configured |
| Centralised log management | Detective | ❌ Not yet |
| MFA for users | Preventive | ❌ Not yet |
| Penetration testing | Assurance | ❌ Planned (when >10K users) |
| WAF (Web Application Firewall) | Preventive | ❌ Not yet |

---

## 5. Residual Risk Acceptance

The following risks are accepted at current stage:
- No user MFA (planned for v1.1)
- No centralised SIEM (accept until 10K users)
- No formal penetration test (planned for 10K users milestone)

These acceptances are revisited at each quarterly risk review.
