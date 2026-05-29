# Customer Offboarding Process

| Field | Value |
|-------|-------|
| **Document ID** | BIZ-005 |
| **Version** | 1.0.0 |
| **Owner** | CX / Legal |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [Head of Product / Legal] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Legal/CX] | Initial process |

---

## Offboarding Triggers

| Trigger | Type | Process |
|---------|------|---------|
| User requests account deletion | Voluntary | Self-service or email request |
| Account suspended for violations | Involuntary | Trust & Safety action |
| User subscription cancellation | Voluntary (subscription only) | Self-service via settings |
| Inactivity (future policy) | Administrative | [Define threshold — e.g., 2 years] |

---

## Voluntary Account Deletion

### User-Initiated (Self-Service)
1. User goes to **Settings → Account → Delete Account**
2. User confirms deletion (with password re-verification)
3. Platform deactivates all listings immediately
4. All active conversations marked as closed
5. Account queued for deletion (30-day grace period)
6. Confirmation email sent with:
   - Confirmation that account deletion is in progress
   - Note that data will be permanently deleted within 30 days
   - How to cancel if it was a mistake (within 30 days)
7. After 30 days: permanent deletion from Supabase Auth + profiles table (cascade deletes related data)

### Email-Requested Deletion (GDPR / POPIA "Right to Erasure")
1. User emails privacy@metups.com: "I request deletion of my account and all personal data"
2. Identity verified (email match + optional account verification)
3. Same process as above, with 30-day grace period
4. Confirmation email with deletion reference number
5. Respond within **30 days** of verified request

---

## Data Retained After Deletion

Per legal obligations, some data may be retained:
| Data | Retention Reason | Retention Period |
|------|-----------------|-----------------|
| Transaction/financial logs | Legal compliance | 7 years |
| Trust & Safety records (if banned) | Safety / legal | 3 years |
| Aggregated analytics (anonymised) | Business intelligence | Indefinitely |

This data is anonymised — not linked to the deleted user's identity.

---

## Involuntary Offboarding (Account Ban)

1. Trust & Safety confirms violation per [SOP-002](../operations/standard-operating-procedures.md)
2. Account suspended in Supabase
3. Listings deactivated
4. Notification email sent:
   - Reason for ban (general)
   - Whether it's temporary or permanent
   - Appeals process
5. If permanent: data retained for Trust & Safety records per above policy

---

## Subscription Cancellation (Future)

1. User cancels via Settings → Subscription → Cancel
2. Access continues to end of billing period
3. Automatic downgrade to Free tier at period end
4. Listings above free tier limit deactivated (not deleted) — user has 30 days to re-activate via re-subscribing
5. Cancellation confirmation email sent

---

## Offboarding Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Deletion requests fulfilled within 30 days | 100% | Legal requirement |
| Voluntary churn rate | < 5%/month | Monitor via cohort analysis |
| Suspension appeals granted | Track | Indicates moderation accuracy |

---

## Offboarding Feedback (Exit Survey)

For voluntary deletions, send a brief exit survey:
1. Why are you leaving? (Multiple choice)
   - Found what I needed / sold my items
   - Not finding good deals
   - Safety concerns
   - Technical issues
   - Privacy concerns
   - Other
2. How could we have served you better? (Open text)

Responses feed into product improvement.
