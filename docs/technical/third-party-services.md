# Third-Party Services Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-006 |
| **Version** | 1.0.0 |
| **Owner** | Engineering / CTO |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial documentation |

---

## Service Inventory

| Service | Provider | Category | Criticality | Monthly Cost |
|---------|---------|---------|-------------|-------------|
| Database + Auth + Storage | Supabase | Backend | Mission Critical | Free / ~$25 Pro |
| Web Hosting + CDN | Cloudflare | Hosting | Mission Critical | Free / ~$19 Pro |
| Google OAuth | Google Cloud | Auth | High | Free |
| Email delivery | [TO BE SELECTED] | Transactional email | High | [TBD] |
| Error monitoring | [TO BE SELECTED — e.g., Sentry] | Observability | Medium | Free tier |
| Uptime monitoring | [TO BE SELECTED — e.g., UptimeRobot] | Monitoring | Medium | Free tier |

---

## 1. Supabase

**Purpose:** Core backend — database, authentication, real-time, file storage  
**Dashboard:** app.supabase.com  
**Documentation:** supabase.com/docs  
**Status page:** status.supabase.com  
**Support:** support.supabase.com  
**SLA:** 99.9% uptime (Pro plan)  
**Data location:** AWS us-east-1  
**SOC 2:** Type II certified  
**DPA:** Available at supabase.com/privacy  

**Services used:**
- Auth: Email/password + Google OAuth
- Database: PostgreSQL with RLS
- Realtime: WebSocket subscriptions for chat
- Storage: Image uploads for listings and profiles

**Failure impact:** Total service outage. Metups cannot function without Supabase.  
**Fallback:** None currently — static pages remain accessible but all dynamic functionality fails.

**Contingency:** See [Disaster Recovery Guide](disaster-recovery.md)

---

## 2. Cloudflare

**Purpose:** Static hosting, CDN, security headers  
**Dashboard:** dash.cloudflare.com
**Documentation:** developers.cloudflare.com
**Status page:** www.cloudflarestatus.com
**SLA:** 99.99% uptime (Pro plan)  
**Data location:** Global CDN (Fastly)  
**SOC 2:** Type II certified  

**Services used:**
- Static site hosting
- Global CDN
- Custom headers (`wrangler.jsonc`)
- SPA redirect rules

**Failure impact:** Platform inaccessible. PWA cached version partially works for installed users.

---

## 3. Google OAuth

**Purpose:** Social sign-in — allows users to sign in with their Google account  
**Console:** console.cloud.google.com  
**Project:** [GOOGLE CLOUD PROJECT NAME]  
**Credentials:** OAuth 2.0 Client ID configured in Supabase Auth settings  

**Failure impact:** Google sign-in unavailable. Email/password login continues to work.

---

## 4. Email Delivery — [TO BE SELECTED]

**Options considered:**
- **Resend** — modern API, generous free tier, good for transactional
- **Postmark** — high deliverability, transactional focus
- **SendGrid** — mature platform, bulk + transactional
- **Supabase built-in SMTP** — simple but limited (consider for early-stage)

**Purpose:** Transactional emails — email verification, password reset, notifications  
**Required templates:**
- Welcome / Email Verification
- Password Reset
- New Message Notification
- Listing Sold Notification

---

## 5. Dependency Versions

| Dependency | Version | Self-hosted | Source |
|-----------|---------|------------|--------|
| Supabase JS | [VERSION — check supabase.min.js] | Yes (`shared/supabase.min.js`) | github.com/supabase/supabase-js |
| Font Awesome | 6.x | Yes (`shared/font-awesome.css` + fonts) | fontawesome.com |
| DM Sans Font | v17 | Yes (`shared/fonts/`) | fonts.google.com |
| Nunito Font | v32 | Yes (`shared/fonts/`) | fonts.google.com |

**Note:** All dependencies are self-hosted for reliability on low-bandwidth connections common in Zimbabwe. This also eliminates CDN-based supply chain attacks.

---

## 6. Service Review Schedule

| Review Activity | Frequency |
|----------------|-----------|
| Check for service plan changes | Quarterly |
| Review service pricing | Quarterly |
| Update DPA if provider changes terms | Annually |
| Evaluate new services | Annually |
| Test failover/contingency plans | Annually |
