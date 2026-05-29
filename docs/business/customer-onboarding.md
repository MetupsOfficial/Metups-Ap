# Customer Onboarding Process

| Field | Value |
|-------|-------|
| **Document ID** | BIZ-004 |
| **Version** | 1.0.0 |
| **Owner** | Product / CX |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [Head of Product] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Product/CX] | Initial process |

---

## Onboarding Overview

Metups is a self-service platform. Onboarding is fully automated for standard users. This document describes the in-product onboarding experience and the metrics we use to measure its success.

---

## Registration Funnel

```
Landing page → Sign Up → Email Verification → Profile Setup → First Listing or Browse
```

| Step | Action | Drop-off Risk |
|------|--------|--------------|
| 1. Landing page | User arrives | Medium |
| 2. Click Sign Up | Tap "Sign Up" button | Low |
| 3. Enter email/password | Fill form | Medium |
| 4. Email verification | Click link in email | HIGH — many users miss this |
| 5. First login | Redirected to app | Low |
| 6. Profile completion | Add photo, city | Medium |
| 7. First listing OR first message | Core activation event | HIGH |

---

## Welcome Experience (Automated)

### Day 0 — Welcome Email (on registration)
Subject: `Welcome to Metups — Zimbabwe's Free Marketplace`

Content:
- Welcome message
- Quick-start tips (post your first listing, browse, install the app)
- Link to Help Center
- Safety tips for meetups

### Day 1 — If no listing posted (re-engagement)
Subject: `It's easy to sell on Metups`

Content:
- Simple 3-step guide to creating a listing
- "Start selling" CTA

### Day 3 — If app not installed (PWA prompt)
Subject: `Install Metups on your phone for faster access`

Content:
- PWA installation instructions
- Benefits of installing (offline access, faster loading)

---

## Onboarding Success Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Email verification rate | % of signups who verify email | >80% |
| Profile completion rate | % of verified users who add city/photo | >60% |
| Day-1 activation rate | % who post or message within 24 hours | >30% |
| Day-7 retention | % still active after 7 days | >50% |
| PWA install rate | % who install the PWA | >30% |

---

## Onboarding Improvement Checklist

- [ ] In-app tooltips / first-run guide for new users
- [ ] Pre-populated listing suggestions based on popular categories
- [ ] Visible onboarding progress indicator ("Complete your profile: 2/3 steps")
- [ ] Sample listings for new users to browse immediately
- [ ] Persistent "How to sell your first item" prompt for users with 0 listings

---

## Business Customer Onboarding (Future — Seller Pro)

When subscription plans are introduced:
1. Automated plan selection and payment
2. Welcome email with Pro feature overview
3. Dedicated onboarding email sequence (5 days)
4. Optional: 1-on-1 setup call for Business tier
5. Pro badge visible on profile within 24 hours of subscription
