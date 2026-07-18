# Access Control Policy

| Field | Value |
|-------|-------|
| **Document ID** | SEC-007 |
| **Version** | 1.0.0 |
| **Owner** | CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / CTO] |

---

## 1. Purpose

This policy defines access control requirements for all Metups systems to enforce least privilege and prevent unauthorised access.

---

## 2. Access Tiers

| Tier | Description | Systems |
|------|-------------|---------|
| T0 — Owner | Full administrative access | CEO, CTO |
| T1 — Admin | Production system access | Senior Engineers, Security Lead |
| T2 — Developer | Read production data (anonymised), deploy to staging | Engineers |
| T3 — Support | Customer-facing tools only | CX Team |
| T4 — Read-only | Logs and metrics only | [QA, Analysts] |

---

## 3. System Access Matrix

| System | T0 | T1 | T2 | T3 | T4 |
|--------|----|----|----|----|-----|
| Supabase Dashboard (production) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Supabase Service Role Key | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cloudflare Dashboard | ✅ | ✅ | ✅ (deploy) | ❌ | ❌ |
| GitHub (main branch) | ✅ | ✅ | PR only | ❌ | ❌ |
| Email accounts (admin) | ✅ | ✅ | ❌ | CX inbox | ❌ |
| Analytics dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. Access Provisioning

- Access is requested via [TICKETING SYSTEM / EMAIL to cto@metups.com]
- All access grants must be approved by the CTO
- Access must be provisioned within 1 business day of approval
- Access is granted with minimum permissions required for the role

---

## 5. Access Removal

- Access is revoked within **4 hours** of termination of employment or contract
- Access is reviewed quarterly for continued necessity
- Account owner can request access revocation at any time

---

## 6. Multi-Factor Authentication (MFA)

MFA is mandatory for:
- [ ] Supabase dashboard access
- [ ] Cloudflare dashboard access
- [ ] GitHub (for any member with push access to main)
- [ ] All email accounts used for admin purposes

---

## 7. Shared Accounts

Shared accounts are **prohibited** for any production system. Each person must have an individual named account.

---

## 8. Quarterly Access Review

The CTO conducts a quarterly review:
- [ ] List all users with access to each system
- [ ] Remove access for departed team members
- [ ] Downgrade access for role changes
- [ ] Confirm MFA is enabled for all admin accounts
- [ ] Document review completion
