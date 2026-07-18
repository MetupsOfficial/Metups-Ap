# Vendor Management Policy

| Field | Value |
|-------|-------|
| **Document ID** | BIZ-003 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Operations |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2027-05-29 |
| **Approved By** | [CEO] |

---

## 1. Purpose

This policy governs how Metups selects, contracts with, monitors, and offboards third-party vendors and service providers.

---

## 2. Vendor Categories

| Category | Examples | Owner |
|---------|---------|-------|
| Infrastructure | Supabase, Cloudflare | CTO |
| Authentication | Google OAuth | CTO |
| Communications | Email provider | CTO |
| Monitoring | UptimeRobot, Sentry | CTO |
| Legal / Compliance | Law firm, GDPR advisors | CEO |
| Financial | Payment processor (future) | CEO |

---

## 3. Vendor Selection Criteria

Before onboarding any new vendor:
- [ ] Security: SOC 2 Type II or equivalent certification
- [ ] Privacy: GDPR-compliant, DPA available
- [ ] Reliability: Published SLA ≥ 99.9% for critical services
- [ ] Cost: Within budget; pricing model understood
- [ ] Support: Adequate support tier for our needs
- [ ] Exit: Clear data portability and exit path

---

## 4. Vendor Onboarding Process

1. CTO evaluates vendor against criteria above
2. Legal reviews contract and DPA
3. CEO approves for contracts >$[THRESHOLD]/month
4. DPA executed before any personal data is processed
5. Vendor added to Third-Party Services register (see [Third-Party Services Documentation](../technical/third-party-services.md))

---

## 5. Ongoing Vendor Management

| Activity | Frequency |
|----------|-----------|
| Review vendor security bulletins | Monthly |
| Review vendor pricing and plan | Quarterly |
| Review DPA for currency | Annually |
| Assess vendor performance vs. SLA | Quarterly |
| Check for SOC 2 certificate renewal | Annually |

---

## 6. Critical Vendor Risk

| Vendor | Risk if Lost | Mitigation |
|--------|-------------|-----------|
| Supabase | Platform non-functional | Export data regularly; platform can migrate to another Postgres host |
| Cloudflare | Platform inaccessible | Code on GitHub; redeploy to Vercel/Cloudflare Pages within hours |
| Google OAuth | Google sign-in broken | Email/password login remains functional |

---

## 7. Vendor Offboarding

When terminating a vendor:
- [ ] Export/migrate all data before termination
- [ ] Confirm data deletion per DPA
- [ ] Obtain written confirmation of deletion
- [ ] Update Third-Party Services register
- [ ] Update DPA register
- [ ] Update Privacy Policy if user-facing change
