# Product Requirements Document (PRD)

| Field | Value |
|-------|-------|
| **Document ID** | PROD-001 |
| **Version** | 1.0.0 |
| **Owner** | Product / CEO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO / CPO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Product Team] | Initial PRD |

---

## 1. Product Overview

**Product Name:** Metups  
**Tagline:** Zimbabwe's Free Marketplace  
**Mission:** Enable safe, frictionless buying and selling of pre-owned goods within Zimbabwean communities.

---

## 2. Problem Statement

Zimbabweans wanting to buy or sell second-hand goods currently rely on:
- Facebook Marketplace (requires Facebook account; data privacy concerns; slow)
- WhatsApp groups (no search, no structure, items buried)
- Physical markets (limited reach, safety concerns)

There is no dedicated, mobile-first, trust-focused marketplace built for Zimbabwe's context.

---

## 3. Target Users

### Primary: Individual Sellers
- Ages 18–45
- Urban areas (Harare, Bulawayo, Mutare)
- Smartphone users (Android dominant market)
- Need to declutter or earn extra income

### Secondary: Buyers
- Same demographic
- Price-sensitive
- Prefer pre-owned to save money
- Value safety in transactions

---

## 4. Core Features (v1.0)

| Feature | Priority | Status |
|---------|---------|--------|
| User registration + auth (email + Google) | P0 | ✅ Live |
| Browse listings feed | P0 | ✅ Live |
| Create/edit/delete listing | P0 | ✅ Live |
| In-app messaging (buyer ↔ seller) | P0 | ✅ Live |
| Wishlist / saved items | P1 | ✅ Live |
| Location-based filtering | P1 | ✅ Live |
| Category filtering | P1 | ✅ Live |
| Full-text search | P1 | ✅ Live |
| User profiles + ratings | P1 | ✅ Live |
| Push notifications (PWA) | P1 | ✅ Live |
| Offline browsing (PWA) | P1 | ✅ Live |
| Mark item as sold | P1 | ✅ Live |
| Report listing/user | P2 | ✅ Live |
| User dashboard (my listings) | P2 | ✅ Live |

---

## 5. Future Features (Roadmap)

| Feature | Priority | Target Quarter |
|---------|---------|----------------|
| Seller identity verification | P1 | Q3 2026 |
| Image search | P2 | Q4 2026 |
| In-app price negotiation | P2 | Q3 2026 |
| Promoted listings (monetisation) | P1 | Q3 2026 |
| Multiple cities / expand to region | P1 | Q4 2026 |
| Native iOS/Android app | P2 | 2027 |
| Buyer/seller escrow (future) | P3 | 2027 |

---

## 6. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Page load time (3G) | < 3 seconds |
| Offline capability | Partial (browsing + cached data) |
| Mobile responsiveness | All features on 320px+ screens |
| Accessibility | WCAG 2.1 AA |
| Uptime | 99.5% |
| Scalability | 100,000 concurrent users |
| Data residency | Supabase AWS (US) — disclose to users |

---

## 7. Success Metrics

| Metric | 3-Month Target | 12-Month Target |
|--------|---------------|----------------|
| Registered users | 1,000 | 25,000 |
| Monthly Active Users (MAU) | 500 | 15,000 |
| Active listings | 2,000 | 50,000 |
| Listings sold per month | 200 | 5,000 |
| App install rate (PWA) | 20% of users | 40% of users |
| NPS score | ≥ 40 | ≥ 60 |

---

## 8. Constraints

- No payment processing (legal/regulatory complexity in Zimbabwe)
- Free-tier infrastructure initially (Supabase, Cloudflare free plans)
- Small engineering team — no complex backend
- Target audience has limited mobile data — performance is critical
