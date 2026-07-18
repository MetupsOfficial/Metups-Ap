# Business Risk Assessment

| Field | Value |
|-------|-------|
| **Document ID** | RISK-002 |
| **Version** | 1.0.0 |
| **Owner** | CEO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CEO] |
| **Classification** | Confidential |

---

## 1. Market Risks

### 1.1 Slow Adoption
**Risk:** User growth is slower than projected; network effects don't materialise.
**Likelihood:** Medium
**Impact:** High — marketplace viability depends on liquidity of buyers and sellers
**Mitigation:**
- Launch in one city (Harare) first — build density before expanding
- Community-driven growth (university campuses, WhatsApp communities)
- Content marketing — blog posts on reselling tips

### 1.2 Competition
**Risk:** Facebook Marketplace, OLX (if re-entering), or a well-funded competitor targets Zimbabwe.
**Likelihood:** Medium
**Impact:** Medium — existing competitor presence is weak; window exists
**Mitigation:**
- Move fast on trust features (verification, ratings)
- Build community loyalty before competitors arrive
- Focus on local context competitors may miss (offline mode, low-data optimisation)

### 1.3 Economic Conditions in Zimbabwe
**Risk:** Currency instability, inflation, or economic downturn reduces consumer spending power.
**Likelihood:** High (Zimbabwe context)
**Impact:** Medium — pre-owned marketplace actually benefits from economic pressure
**Mitigation:**
- Metups benefits from economic downturn (people sell more, buy pre-owned)
- Free platform reduces adoption friction

---

## 2. Operational Risks

### 2.1 Key Person Dependency
**Risk:** Platform knowledge concentrated in 1–2 founders.
**Likelihood:** High (early-stage startup)
**Impact:** Very High — loss of key person could halt operations
**Mitigation:**
- Document all systems (this documentation package)
- Cross-train team members on critical operations
- Store all credentials in team password manager (not individual's head)
- Business continuity plan in place

### 2.2 Platform Misuse (Fraud/Scams)
**Risk:** Bad actors use Metups to perpetrate advance-fee fraud or sell stolen goods.
**Likelihood:** High (endemic in online classifieds)
**Impact:** High — trust damage could kill the platform
**Mitigation:**
- Active moderation from day 1
- User reporting (in-app + email)
- Safety guides and fraud warnings
- Community ratings system
- Identity verification roadmap

### 2.3 Safety Incident (Violent Meetup)
**Risk:** A transaction facilitated on Metups results in robbery or violence.
**Likelihood:** Low
**Impact:** Catastrophic — media coverage, regulatory action, legal liability
**Mitigation:**
- Prominent safety guides throughout the platform
- No financial transactions processed by Metups (reduces motivation to rob)
- Encourage police station meetups
- Report mechanism
- Insurance (consider product liability insurance)

---

## 3. Financial Risks

### 3.1 Failure to Monetise
**Risk:** Unable to convert free users to paid plans.
**Likelihood:** Medium
**Impact:** High — business sustainability
**Mitigation:**
- Build user base on free tier before monetising
- Test multiple revenue streams (boosts vs. subscriptions)
- Keep infrastructure costs minimal until revenue proven

### 3.2 Infrastructure Cost Overrun
**Risk:** Unexpected usage spike (viral growth) triggers large Supabase/Cloudflare bills.
**Likelihood:** Low (would be a good problem)
**Impact:** Medium
**Mitigation:**
- Monitor usage vs. plan limits monthly
- Set billing alerts in Supabase and Cloudflare
- Rate limiting on expensive operations

---

## 4. Reputational Risks

### 4.1 Public Safety Incident
See 2.3 above.

### 4.2 Data Breach
**Risk:** Personal data of users is exposed.
**Likelihood:** Low (Supabase security + RLS)
**Impact:** Very High — trust loss, regulatory action, legal claims
**Mitigation:**
- Strong security posture (see Security Policy)
- Breach response plan documented and tested

### 4.3 Negative Press
**Risk:** Platform used for high-profile fraud case attracting media attention.
**Likelihood:** Medium (as platform grows)
**Impact:** High
**Mitigation:**
- Proactive Trust & Safety
- Media response plan in place
- CEO as spokesperson for sensitive matters
