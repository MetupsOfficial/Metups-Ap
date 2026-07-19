# Cookie Policy

| Field | Value |
|-------|-------|
| **Document ID** | LEGAL-003 |
| **Version** | 1.0.0 |
| **Owner** | Legal / Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2027-05-29 |
| **Approved By** | [CEO / Legal Counsel] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | EUGINE BHEBHE | Initial release |

---

## 1. What Are Cookies?

Cookies are small text files stored on your device by your browser when you visit a website. Metups also uses **localStorage** and **sessionStorage** (browser-based storage) which function similarly. This policy covers all such technologies.

---

## 2. Cookies We Use

### 2.1 Strictly Necessary (Cannot Be Disabled)

| Name | Provider | Purpose | Duration |
|------|----------|---------|----------|
| `sb-[ref]-auth-token` | Supabase | Authentication session token | Until sign-out |
| `sb-[ref]-auth-token-code-verifier` | Supabase | PKCE auth flow security | Session |

These cookies are required for the platform to function. Without them, you cannot sign in.

### 2.2 Functional (Enabled by Default, Can Be Disabled)

| Name | Provider | Purpose | Duration |
|------|----------|---------|----------|
| `metups_location` | Metups | Stores your selected city for location filtering | 30 days |
| `metups_theme` | Metups | Remembers your UI theme preference | 1 year |
| `metups_notification_prefs` | Metups | Remembers notification opt-in state | 1 year |

### 2.3 Analytics (Opt-In Only)

| Name | Provider | Purpose | Duration |
|------|----------|---------|----------|
| [ANALYTICS COOKIE NAME] | [PROVIDER] | Aggregate usage analytics | [DURATION] |

We do **not** currently use advertising or cross-site tracking cookies.

---

## 3. PWA and Service Worker Storage

As a Progressive Web App, Metups uses:
- **Cache Storage API** — to cache static assets for offline functionality
- **IndexedDB** — to cache listing data for offline browsing

This data is stored locally on your device and is not transmitted to our servers. You can clear it by uninstalling the PWA or clearing your browser data.

---

## 4. Managing Cookies

You can control cookies via:
- **Browser settings:** Most browsers allow you to block or delete cookies
- **Platform settings:** Metups → Settings → Privacy to manage functional cookies

Note: Disabling strictly necessary cookies will prevent you from signing in.

---

## 5. Contact

Cookie enquiries: privacy@metups.com
