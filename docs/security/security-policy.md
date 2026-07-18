# Security Policy

| Field | Value |
|-------|-------|
| **Document ID** | SEC-001 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Security Lead |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / CTO] |
| **Classification** | Internal |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Security Team] | Initial release |

---

## 1. Purpose and Scope

This Security Policy establishes the security principles, controls, and responsibilities for Metups platform operations. It applies to all team members, contractors, and third-party providers with access to Metups systems.

---

## 2. Security Principles

1. **Least Privilege:** Users and systems are granted only the access required to perform their function
2. **Defence in Depth:** Multiple security controls layered so no single failure compromises the system
3. **Secure by Default:** Security controls are enabled by default; users opt into less security, not more
4. **Zero Trust:** No user, system, or network is inherently trusted; all access is verified
5. **Transparency:** Security incidents affecting users are disclosed promptly and honestly

---

## 3. Authentication and Access

### 3.1 Platform Authentication
- User authentication via Supabase Auth (email/password or Google OAuth)
- Passwords hashed with bcrypt (Supabase default)
- JWT tokens with appropriate expiry (Supabase managed)
- PKCE flow for OAuth to prevent token interception
- HTTPS enforced on all pages; HTTP automatically redirected

### 3.2 Administrative Access
- All admin tools require individual named accounts (no shared credentials)
- Supabase dashboard access requires MFA
- Cloudflare dashboard access requires MFA
- Admin access granted on need-to-know basis
- Access reviewed quarterly

### 3.3 Database Security
- Supabase Row Level Security (RLS) enabled on all tables
- Users can only read/write their own data (enforced at database level)
- Service role key never exposed to client-side code
- Database connections use TLS

---

## 4. Data Security

### 4.1 Data in Transit
- All communications use TLS 1.2 minimum
- HTTPS enforced via Cloudflare headers and application-level redirect
- HTTP Strict Transport Security (HSTS) headers enabled

### 4.2 Data at Rest
- Supabase database encryption at rest (AES-256 via AWS RDS)
- File storage encrypted at rest (Supabase Storage / S3)
- No sensitive data stored in browser localStorage (only session tokens managed by Supabase Auth)

### 4.3 Sensitive Data Handling
- Never log personally identifiable information (PII) to browser console in production
- Phone numbers and emails not exposed in API responses to other users
- Supabase anon key is not a secret (it enforces RLS) but service role key is never shared

---

## 5. Application Security

### 5.1 OWASP Top 10 Controls
| Risk | Control |
|------|---------|
| A01 Broken Access Control | Supabase RLS policies on all tables |
| A02 Cryptographic Failures | TLS everywhere, Supabase handles password hashing |
| A03 Injection | Supabase client uses parameterized queries |
| A04 Insecure Design | Security reviewed during feature development |
| A05 Security Misconfiguration | CSP, X-Frame-Options, CORS headers via Cloudflare |
| A06 Vulnerable Components | Dependencies reviewed quarterly |
| A07 Auth Failures | Supabase Auth with PKCE, rate limiting |
| A08 Software Integrity | Supabase CDN served locally to prevent supply chain attacks |
| A09 Logging & Monitoring | Supabase logs + [monitoring tool] |
| A10 SSRF | N/A — no server-side HTTP requests from application |

### 5.2 HTTP Security Headers
Enforced via Cloudflare (`wrangler.jsonc`):
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), camera=(self), microphone=(self)`
- `Content-Security-Policy: [TO BE DEFINED]`

### 5.3 Input Validation
- All user inputs validated client-side (UX) and server-side (Supabase RLS + constraints)
- Database constraints enforce data types, lengths, and valid ranges
- File uploads validated for type and size before storage

---

## 6. Infrastructure Security

- Hosting: Cloudflare CDN (SOC 2 Type II certified)
- Database: Supabase (SOC 2 Type II, ISO 27001)
- No server-side compute (static PWA + Supabase backend)
- Zero infrastructure to patch — Cloudflare and Supabase manage all server security

---

## 7. Security Review Schedule

| Activity | Frequency |
|----------|-----------|
| Dependency vulnerability scan | Before each release |
| Supabase RLS policy review | Quarterly |
| Access control audit | Quarterly |
| Security header review | Every 6 months |
| Full security assessment | Annually |
| Penetration test | Annually (upon reaching 10,000 users) |

---

## 8. Incident Response

See [Incident Response Plan](incident-response-plan.md) for detailed procedures.

**Security contact:** security@metups.com

---

## 9. Security Training

All team members with access to production systems must:
- Complete security awareness training within 30 days of joining
- Complete annual security refresher training
- Report suspected security incidents immediately to security@metups.com

---

## 10. Third-Party Security

All third-party services must:
- Have SOC 2 Type II or equivalent certification
- Provide a Data Processing Agreement
- Be reviewed annually for continued compliance
- Notify Metups within 72 hours of any security incident affecting Metups data
