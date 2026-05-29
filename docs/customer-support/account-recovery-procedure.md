# User Account Recovery Procedure

| Field | Value |
|-------|-------|
| **Document ID** | CS-006 |
| **Version** | 1.0.0 |
| **Owner** | Customer Support / Security |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO / CX Manager] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [CX/Security] | Initial release |

---

## 1. Overview

This procedure defines how Metups handles account recovery requests. Security and identity verification are paramount — account recovery is a high-risk operation that could allow an attacker to seize a legitimate user's account if handled incorrectly.

---

## 2. Scenario 1: Forgot Password (Self-Service)

**Prerequisites:** User still has access to their registered email.

### Steps:
1. User visits metups.com/login → clicks "Forgot Password"
2. User enters their registered email address
3. System sends a password reset link (via Supabase Auth) with 1-hour expiry
4. User clicks the link and sets a new password
5. All existing sessions are invalidated on password change
6. User is redirected to login

**Support involvement:** None required — fully automated.

---

## 3. Scenario 2: Lost Access to Email (Manual Recovery)

**Security risk level:** HIGH — requires identity verification.

### Steps:

**Step 1 — User submits recovery request**
- User emails support@metups.com with subject: `ACCOUNT RECOVERY REQUEST`
- Include: old email, new email, account username/display name, approximate registration date

**Step 2 — Identity verification (support agent)**
- [ ] Request government-issued photo ID (national ID or passport)
- [ ] Request at least 2 of the following account verification factors:
  - Phone number associated with account
  - Date of birth associated with account
  - Recent listing title or ID
  - Screenshot of past messages (if accessible)
- [ ] Cross-reference with Supabase user records
- [ ] Do NOT proceed with fewer than 2 verification factors

**Step 3 — Account update**
- [ ] If identity verified: update email in Supabase Auth admin panel
- [ ] Send verification email to new address
- [ ] Invalidate all existing sessions
- [ ] Log the recovery action in support ticket

**Step 4 — Notify user**
- [ ] Confirm account has been updated
- [ ] Advise user to change password and enable any available 2FA

**Timeline:** 2–5 business days

---

## 4. Scenario 3: Account Compromised / Hacked

**Security risk level:** CRITICAL.

### Steps:

**Step 1 — Immediate containment (support agent)**
- [ ] Invalidate all active sessions in Supabase Auth admin (disable then re-enable account)
- [ ] Suspend account temporarily while investigating
- [ ] Log incident in security log

**Step 2 — Verify legitimate owner**
- [ ] Follow identity verification process in Scenario 2
- [ ] Review login history for suspicious IP addresses
- [ ] Review any changes made by attacker (listings, messages)

**Step 3 — Recovery**
- [ ] Restore account to legitimate owner via email update
- [ ] Revert any malicious changes (fraudulent listings, messages)
- [ ] Restore legitimate listings if deleted by attacker

**Step 4 — Escalation**
- [ ] Escalate to security team if attack pattern suggests broader threat
- [ ] Consider notifying other users if compromised account messaged them fraudulently

**Timeline:** P1 — 2 hours initial response

---

## 5. Scenario 4: Google OAuth Account Recovery

If user signed in with Google and has lost access to their Google account:
1. Advise user to recover their Google account first via accounts.google.com
2. If Google account permanently inaccessible, proceed as Scenario 2 with additional Google account ownership verification

---

## 6. Security Controls

- Account recovery agents must have 2FA enabled on their own accounts
- All account changes must be logged with timestamp, agent ID, and justification
- Sensitive changes require second agent approval for accounts with >50 listings or >3 years old
- No recovery actions during off-hours without CTO approval

---

## 7. Escalation

| Scenario | Escalate To |
|---------|------------|
| Identity unclear after 2 attempts | CX Manager |
| Evidence of identity fraud | Security team + Legal |
| Recovery request for high-profile/business account | CTO |
