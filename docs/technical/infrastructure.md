# Infrastructure Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-010 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Infrastructure Philosophy

Metups follows a **zero-infrastructure** philosophy. There are no servers to manage, patch, or monitor. All infrastructure is provided and managed by third-party SaaS platforms with strong SLAs.

> *"The best server is no server."*

---

## Infrastructure Map

```
┌──────────────────────────────────────────────────────┐
│                    metups.com                        │
│                 (DNS: [REGISTRAR])                   │
│            CNAME → [NETLIFY-SLUG].netlify.app        │
└──────────────────────────────────────────┬───────────┘
                                           │
                              ┌────────────▼────────────┐
                              │     Netlify CDN         │
                              │  (Global edge network)   │
                              │  - Static files         │
                              │  - Security headers     │
                              │  - HTTPS (auto TLS)     │
                              │  - Cache control        │
                              └────────────┬────────────┘
                                           │ API calls
                              ┌────────────▼────────────┐
                              │       Supabase          │
                              │    (AWS us-east-1)      │
                              │                         │
                              │  ┌─────────────────┐   │
                              │  │  PostgreSQL DB   │   │
                              │  │  (RDS managed)   │   │
                              │  ├─────────────────┤   │
                              │  │  Auth Service    │   │
                              │  ├─────────────────┤   │
                              │  │  Realtime WS     │   │
                              │  ├─────────────────┤   │
                              │  │  Storage (S3)    │   │
                              │  └─────────────────┘   │
                              └─────────────────────────┘
```

---

## Domain and DNS

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `metups.com` | A / CNAME | Netlify IP | Main site |
| `www.metups.com` | CNAME | `metups.com` | www redirect |
| `help.metups.com` | CNAME | [HELP PLATFORM] | Help Center |
| `status.metups.com` | CNAME | [STATUS PAGE] | Status page |

**DNS Registrar:** [REGISTRAR — e.g., Cloudflare, GoDaddy, Namecheap]  
**TTL recommendation:** 3600 (1 hour) normal; reduce to 60 before planned DNS changes

---

## Netlify Configuration

| Setting | Value |
|---------|-------|
| Publish directory | `src/` |
| Build command | None |
| Node version | N/A |
| Environment | Production |
| Branch | main |
| Deploy previews | Enabled (for PRs) |
| HTTPS | Auto (Let's Encrypt) |
| HTTP/2 | Enabled (Netlify default) |

**Security headers** are configured in `netlify.toml` — see that file for current header values.

---

## Supabase Configuration

| Setting | Value |
|---------|-------|
| Region | US East (N. Virginia) — aws-east-1 |
| Plan | [Free / Pro / Team] |
| Database size | [CURRENT SIZE] |
| Max connections | 60 (Free) / 200 (Pro) |
| Pooling | PgBouncer (Pro+) |
| Backups | Daily (7-day retention on Free, 14-day on Pro) |
| PITR | Available on Pro+ plans |
| Storage bucket | `product-images`, `avatars` |

---

## Cost Overview

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Netlify | Starter (Free) / Pro | $0 / $19 |
| Supabase | Free / Pro | $0 / $25 |
| Domain (metups.com) | Annual | ~$12/year |
| Email delivery | [TBD] | ~$0–$20 |
| Monitoring | [TBD] | $0 (free tiers) |
| **Total** | | **~$0–$64/month** |

**Scale trigger:** Move to paid plans when:
- Netlify: >100GB bandwidth/month or >300 build minutes
- Supabase: >500MB database or >1GB storage or >50,000 MAUs

---

## Scaling Plan

| Users | Infrastructure Changes |
|-------|----------------------|
| 0–1,000 | Free tiers sufficient |
| 1,000–10,000 | Supabase Pro ($25/month) for PITR backups |
| 10,000–50,000 | Netlify Pro for bandwidth; Supabase Pro plan |
| 50,000–100,000 | Supabase Team plan + PgBouncer + read replica consideration |
| 100,000+ | Custom infrastructure evaluation; consider edge functions for rate limiting |
