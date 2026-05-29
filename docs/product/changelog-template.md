# Changelog

All notable changes to Metups are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

### Security
- 

---

## [1.0.0] — 2026-05-29

### Added
- Initial production launch of Metups marketplace
- User registration and authentication (email/password + Google OAuth)
- PWA installation support for Android and iOS
- Marketplace listing feed with search and filtering
- Listing creation with photo upload (up to [X] photos)
- In-app real-time messaging between buyers and sellers
- Wishlist / saved listings feature
- User profiles with ratings system
- Location-based browsing (city filtering)
- Category filtering (Electronics, Furniture, Clothing, etc.)
- Full-text search with weighted ranking
- Push notifications for new messages
- Offline browsing via Service Worker cache
- "Mark as sold" functionality
- In-app reporting for listings and users
- My Listings dashboard
- Password reset via email
- Open Graph tags for social media link previews
- HTTPS enforced with automatic HTTP redirect
- Security headers via Netlify (X-Frame-Options, CSP, etc.)

### Security
- Supabase Row Level Security (RLS) enforced on all tables
- PKCE OAuth flow implemented
- Supabase JS library self-hosted (eliminates CDN supply chain risk)
- No sensitive credentials in client-side code

---

## Template for Future Entries

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- New feature description

### Changed
- Change to existing feature

### Deprecated
- Feature that will be removed in a future version

### Removed
- Feature that was removed

### Fixed
- Bug fix description

### Security
- Security fix or improvement
```
