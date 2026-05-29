# Metups — Project README

| Field | Value |
|-------|-------|
| **Document ID** | TECH-001 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Updated** | 2026-05-29 |

---

## What Is Metups?

**Metups** is a free, community-driven online marketplace for buying and selling pre-owned goods in Zimbabwe. Users list items, browse by location and category, communicate via in-app chat, and arrange safe local meetups to complete transactions.

**Live URL:** https://metups.com  
**Status:** Production

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES Modules) |
| PWA | Service Worker, Web App Manifest |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Hosting | Netlify (static CDN) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | PostgreSQL (via Supabase) |
| File Storage | Supabase Storage |
| Fonts | DM Sans, Nunito (self-hosted woff2) |
| Icons | Font Awesome Free (self-hosted) |

---

## Project Structure

```
Metups-Ap/
├── src/
│   ├── index.html                    # Home / listing feed
│   ├── shared/
│   │   ├── supabase.js               # Supabase client singleton
│   │   ├── utils.js                  # Auth helpers, formatters
│   │   ├── styles.css                # Global styles
│   │   ├── navigation.js             # Bottom nav component
│   │   ├── network-status.js         # Online/offline detection
│   │   ├── productFilter.js          # Filter and search logic
│   │   ├── font-awesome.css          # Icon library
│   │   └── fonts/                    # Self-hosted woff2 fonts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login.html / signup.html
│   │   │   ├── confirm.html / reset-password.html
│   │   │   └── auth.js               # Auth logic
│   │   ├── products/
│   │   │   ├── dashboard.html        # My Listings
│   │   │   ├── product.html          # Single listing view
│   │   │   ├── add_product.html      # Create/edit listing
│   │   │   └── products.js / dashboard.js
│   │   ├── chat/
│   │   │   ├── messaging.html        # Inbox
│   │   │   └── messaging.js
│   │   ├── profile/
│   │   │   ├── profile.html / settings.html / menu.html
│   │   ├── wishlist/
│   │   │   ├── wishlist.html / add_wishlist.html
│   │   │   └── wishlist.js
│   │   ├── notifications/
│   │   │   └── notifications.html
│   │   └── location/
│   │       └── location.js
│   └── pwa/
│       ├── manifest.json
│       └── sw.js                     # Service worker
├── supabase/
│   ├── metups_migration.sql          # Full DB schema
│   ├── fix_rls_and_policies.sql      # RLS policies
│   └── increment_unread.sql          # Utility function
├── icons/                            # App icons (all sizes)
├── docs/                             # All documentation (this folder)
└── netlify.toml                      # Netlify deployment config
```

---

## Getting Started (Local Development)

### Prerequisites
- A modern web browser (Chrome recommended)
- A Supabase account
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/[ORG]/Metups-Ap.git
cd Metups-Ap
```

### 2. Set Up Supabase

1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Run the migration SQL: `supabase/metups_migration.sql` in the SQL Editor
3. Run RLS policies: `supabase/fix_rls_and_policies.sql`
4. Configure Google OAuth: Authentication → Providers → Google
5. Copy your Project URL and anon key

### 3. Configure Credentials

Update `src/shared/supabase.js`:

```javascript
const SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 4. Run Locally

No build step required. Use any static server:

```bash
# Python (built-in)
cd src && python3 -m http.server 8080

# Node.js
npx serve src

# VS Code: use Live Server extension
```

Open http://localhost:8080

---

## Deployment

Deployed via Netlify. See [Deployment Guide](deployment-guide.md).

```bash
# Deploy via Netlify CLI
netlify deploy --prod
```

Or push to `main` branch if CI/CD is configured.

---

## Key Concepts

### Authentication Flow
1. User signs up / signs in via Supabase Auth
2. Supabase returns a JWT session token
3. All API calls are authenticated with this token
4. Row Level Security (RLS) enforces data access at the database level

### Row Level Security (RLS)
Every database table has RLS policies. Users can only read their own private data (messages, profile). Public data (listings) is readable by all authenticated users.

### PWA / Offline Mode
The Service Worker (`sw.js`) caches static assets and previously loaded listings. The app works partially offline — browsing is possible, actions requiring the server are queued.

---

## Environment Variables

See [Environment Variables Documentation](environment-variables.md).

---

## Contributing

See [Developer Onboarding Guide](../team/developer-onboarding.md) and [Code Review Guidelines](../team/code-review-guidelines.md).

---

## Support

- **Technical issues:** engineering@metups.com
- **User support:** support@metups.com
- **Security:** security@metups.com
