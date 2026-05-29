# Internal Pricing Documentation

| Field | Value |
|-------|-------|
| **Document ID** | BIZ-002 |
| **Version** | 1.0.0 |
| **Owner** | CEO / Finance |
| **Last Reviewed** | 2026-05-29 |
| **Classification** | Confidential — Internal Only |
| **Approved By** | [CEO] |

---

## Current Revenue Model

Metups is currently **free** — no revenue is generated. This document defines the planned monetisation roadmap.

---

## Planned Revenue Streams

| Stream | Model | Target Launch |
|--------|-------|--------------|
| Listing boosts / promoted placement | One-time fee | Q3 2026 |
| Seller Pro subscription | Monthly/Annual | Q4 2026 |
| Business subscription | Annual only | Q1 2027 |
| Seller verification badge | One-time fee | Q4 2026 |

---

## Planned Pricing (Draft — Subject to Market Testing)

### Listing Boost
- 3-day boost (top of feed in category): USD $1.00
- 7-day boost: USD $2.00
- 30-day featured listing: USD $5.00

### Seller Pro (Monthly)
- USD $5.00/month (paid monthly)
- USD $48.00/year (paid annually — 20% discount)

**Pro features:**
- Unlimited listings (vs. free tier limit)
- Priority placement in search
- Analytics dashboard
- Verified seller badge
- Bulk listing tools

### Business Plan (Annual)
- USD $120.00/year

**Business features:**
- All Pro features
- Dedicated support
- API access (future)
- Multiple user accounts (future)

---

## Infrastructure Costs (Monthly)

| Service | Free Tier | Paid Tier | Trigger |
|---------|-----------|-----------|---------|
| Supabase | $0 | $25/month (Pro) | >500MB DB or >50K MAUs |
| Netlify | $0 | $19/month (Pro) | >100GB bandwidth |
| Email provider | $0 | ~$20/month | >500 emails/month |
| Monitoring | $0 | — | Free tier sufficient |
| **Total** | **$0** | **~$64/month** | |

---

## Unit Economics (Projections)

| Metric | 1K Users | 10K Users | 50K Users |
|--------|---------|----------|----------|
| Infra cost | $0 | $64/month | $200/month |
| Pro subscribers (est. 5%) | 0 | 500 | 2,500 |
| Revenue (@ $5/month) | $0 | $2,500/mo | $12,500/mo |
| Gross margin (est.) | — | ~97% | ~98% |

---

## Pricing Change Process

Any pricing change requires:
- CEO approval
- 30 days' advance notice to existing subscribers
- Legal review of subscription terms compliance
- Update to [Subscription Policy](../legal/subscription-policy.md)
- Update to [Terms of Service](../legal/terms-of-service.md) if material change
