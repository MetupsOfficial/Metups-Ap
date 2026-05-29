# Architecture Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-002 |
| **Version** | 1.0.0 |
| **Owner** | CTO / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial architecture documentation |

---

## 1. System Overview

Metups is a **serverless, static-first web application** deployed as a Progressive Web App (PWA). There is no custom backend server. All dynamic capabilities are provided by Supabase (Backend-as-a-Service).

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Metups PWA (Browser / Installed)            │  │
│  │                                                          │  │
│  │  HTML / CSS / Vanilla JS  ←→  Service Worker (sw.js)    │  │
│  │         ↕                          ↕                     │  │
│  │  supabase.js client        Cache Storage / IndexedDB    │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
            ┌───────────────┴───────────────┐
            │                               │
  ┌─────────▼──────────┐      ┌─────────────▼──────────────┐
  │   Netlify CDN       │      │        Supabase             │
  │                     │      │                             │
  │  Static assets      │      │  ┌─────────────────────┐   │
  │  (HTML, JS, CSS,    │      │  │  Auth (JWT + OAuth)  │   │
  │   images, fonts)    │      │  ├─────────────────────┤   │
  │                     │      │  │  PostgreSQL DB       │   │
  │  Security headers   │      │  │  (with RLS)         │   │
  │  Cache control      │      │  ├─────────────────────┤   │
  └─────────────────────┘      │  │  Realtime WebSocket  │   │
                               │  ├─────────────────────┤   │
                               │  │  Storage (S3-compat) │   │
                               │  └─────────────────────┘   │
                               └─────────────────────────────┘
                                           │
                               ┌───────────▼──────────┐
                               │  Google OAuth         │
                               │  (for sign-in only)   │
                               └──────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend (Client)

**Type:** Static SPA-like multi-page app (MPA with shared components)

| Component | File | Role |
|-----------|------|------|
| App Shell | `src/index.html` | Home/listing feed |
| Auth Module | `features/auth/auth.js` | Sign-in, sign-up, OAuth flow |
| Products Module | `features/products/products.js` | Listing CRUD, filtering |
| Chat Module | `features/chat/messaging.js` | Real-time messaging |
| Wishlist Module | `features/wishlist/wishlist.js` | Saved items |
| Location Module | `features/location/location.js` | Geolocation services |
| Navigation | `shared/navigation.js` | Bottom nav bar component |
| Network Status | `shared/network-status.js` | Online/offline detection |
| Product Filter | `shared/productFilter.js` | Search and filter logic |
| Supabase Client | `shared/supabase.js` | API client singleton |
| Utilities | `shared/utils.js` | Auth checks, formatters |

**Module Pattern:** ES Modules (`import/export`) — no bundler required.

### 2.2 Service Worker (PWA Layer)

`src/pwa/sw.js` handles:
- Static asset caching (cache-first strategy)
- Listing data caching (stale-while-revalidate)
- Background sync for offline actions (future)
- Push notification handling (future)

### 2.3 Backend (Supabase)

| Supabase Service | Metups Usage |
|-----------------|-------------|
| **Auth** | Email/password sign-up, Google OAuth, JWT session management |
| **Database (PostgreSQL)** | All application data: profiles, products, messages, wishlist, ratings |
| **Realtime** | Live chat message delivery, notification updates |
| **Storage** | Product listing photos, user profile photos |
| **Row Level Security** | Access control at database level — users only see/modify their own data |

### 2.4 Hosting (Netlify)

| Feature | Configuration |
|---------|--------------|
| Publish directory | `src/` |
| Build command | None (pure static) |
| Headers | Security headers (X-Frame-Options, CSP, etc.) |
| Redirects | SPA fallback to index.html |
| Cache control | Long cache for assets, no-cache for SW and manifest |

---

## 3. Database Schema

See [Database Documentation](database-documentation.md) for full schema.

**Core Tables:**
```
profiles          ← User accounts (extends Supabase auth.users)
products          ← Listings (pre-owned goods)
conversations     ← Chat threads between buyer and seller
messages          ← Individual chat messages
wishlist          ← User-saved listings
notifications     ← In-app notification records
ratings           ← Buyer/seller transaction ratings
```

---

## 4. Data Flow

### Listing Creation
```
User → add_product.html → products.js
    → supabase.storage.upload(photos)
    → supabase.from('products').insert({...})
    → Listing appears in index.html feed
```

### Authentication
```
User → login.html → auth.js
    → supabase.auth.signInWithPassword() or signInWithOAuth('google')
    → Supabase returns JWT session
    → Stored in supabase-managed localStorage key
    → utils.js checkAuth() validates on every page load
```

### Real-time Chat
```
User A → messaging.js → supabase.from('messages').insert()
    → Supabase Realtime broadcasts to User B's subscription
    → User B's messaging.js receives event and updates UI
```

---

## 5. Security Architecture

| Layer | Control |
|-------|---------|
| Network | HTTPS enforced, HSTS headers, Netlify CDN |
| Application | Input validation, CSP headers |
| API | Supabase anon key + RLS (no secrets in browser) |
| Database | RLS policies on all tables, parameterized queries |
| Auth | JWT tokens, PKCE OAuth flow, bcrypt passwords |
| Files | Storage policies match database RLS |

---

## 6. Scalability

**Current architecture supports ~10,000 concurrent users** on Supabase's managed infrastructure.

For 100,000+ users, consider:
- Supabase Pro/Team plan (higher connection pooling via PgBouncer)
- Implement database read replicas for listing feed queries
- CDN-edge caching for popular listings
- Image optimisation pipeline (Supabase Image Transformation or Cloudinary)
- Rate limiting on critical API endpoints

---

## 7. Architecture Decision Records (ADRs)

See [ADR Template](../team/adr-template.md) and `docs/team/adrs/` for decisions log.

Key decisions documented:
- ADR-001: Vanilla JS over React/Vue (simplicity, no build step, PWA performance)
- ADR-002: Supabase over custom backend (time-to-market, built-in auth + RLS)
- ADR-003: Netlify over Vercel (netlify.toml familiarity, simpler redirects)
- ADR-004: Self-host fonts and dependencies (mobile data reliability, supply chain security)
