# Password Policy

| Field | Value |
|-------|-------|
| **Document ID** | SEC-008 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Security |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## 1. User Account Passwords (Platform Users)

Metups delegates all password management to Supabase Auth. The following requirements are enforced:

| Requirement | Setting |
|------------|---------|
| Minimum length | 8 characters |
| Complexity | [Configure in Supabase: Auth → Password Strength] |
| Hashing algorithm | bcrypt (Supabase default) |
| Password reset | Via email link (1-hour expiry) |
| Failed login lockout | [Configure Supabase rate limiting] |
| Breach detection | [Consider HaveIBeenPwned API integration] |

**Recommendation:** Encourage users to use 12+ character passwords. Consider passphrase guidance in the signup UI.

---

## 2. Staff/Admin Passwords

All team members with access to production systems must comply with:

| Requirement | Standard |
|------------|---------|
| Minimum length | 16 characters |
| Complexity | Mix of uppercase, lowercase, numbers, symbols |
| Reuse | No reuse of last 10 passwords |
| Expiry | 90 days for admin accounts |
| Manager | Password manager required (e.g., 1Password, Bitwarden) |
| MFA | Mandatory for all systems (see Access Control Policy) |
| Sharing | Strictly prohibited |

---

## 3. Service Credentials

| Credential | Storage | Rotation |
|-----------|---------|----------|
| Supabase ANON key | Cloudflare environment variables | Annually or on suspected exposure |
| Supabase SERVICE ROLE key | Secure vault only (NEVER in code) | Quarterly |
| OAuth client secrets | Cloudflare environment variables | Annually |
| Third-party API keys | Cloudflare environment variables | Per vendor recommendation |

**Critical:** The Supabase SERVICE ROLE key bypasses Row Level Security. It must NEVER be committed to Git or exposed to the browser. Rotate immediately if exposed.

---

## 4. Incident Response for Compromised Passwords

If a staff password or service credential is suspected compromised:
1. Rotate immediately without waiting for confirmation
2. Invalidate all sessions associated with the compromised credential
3. Notify CTO within 1 hour
4. Log the incident per the [Incident Response Plan](incident-response-plan.md)
