# Eugine Bhebhe — Portfolio: Developer Guide

For whoever picks this up next (including future-Eugine). This covers what's
built, how to configure it, and concrete next steps to push it further.

## 1. What this is

A single-file static portfolio (`index.html`) — no framework, no build step.
Design language: an "engineering status dashboard" — the hero shows real
projects as monitored services (LIVE / ACTIVE DEV), and case studies are
styled as spec sheets. Two features are backed by a real database
(Supabase), not just static content: the visitor counter and the contact
form.

**Files:**
```
index.html            → the entire site (HTML + CSS + JS, one file)
supabase_setup.sql    → run once in Supabase to create the backend
Eugine_Bhebhe_CV.pdf  → linked from the "Résumé ↓" button in the nav
DEVELOPER_GUIDE.md    → this file
```

## 2. First-time setup (required before the counter/form work)

1. Open the **Metups** Supabase project dashboard → **SQL Editor** → **New query**.
2. Paste the full contents of `supabase_setup.sql` and run it. This creates:
   - `portfolio_counters` — a single-row counter, locked behind RLS so it's
     only reachable via the `increment_portfolio_views()` function (never
     directly readable/writable by visitors).
   - `portfolio_messages` — stores contact-form submissions. Anyone can
     `INSERT` (submit the form); nobody can `SELECT` from the client, so
     messages are only readable from the Supabase dashboard directly.
3. Go to **Project Settings → API**, copy the **Project URL** and the
   **anon / public key**.
4. In `index.html`, find the block near the bottom marked
   `TODO — Supabase setup` and paste the anon key into `SUPABASE_ANON_KEY`.
   The `SUPABASE_URL` is already set to the Metups project.
5. Open `index.html` directly in a browser (or deploy it) and confirm the
   "This page" row in the status dashboard changes from
   `counter not configured` to a real number, and that submitting the
   contact form shows a success message.

## 3. Deployment

The site is one static file plus a PDF — it can be hosted anywhere that
serves static files. Two options:

**Option A — subpath on the existing Metups Netlify site** (matches the
`metups.com/euginebhebhe` URL already chosen):
- Add a `euginebhebhe/` folder to the Metups repo containing `index.html`
  and `Eugine_Bhebhe_CV.pdf`.
- Netlify will serve it at `metups.com/euginebhebhe` automatically on the
  next deploy.

**Option B — dedicated subdomain** (`euginebhebhe.metups.com`), which reads
more clearly as "this is a personal page" rather than a path nested inside
the business site:
- In Netlify, create a new site pointed at a folder containing these files,
  or use Netlify's "branch subdomain" / a separate small site.
- Add a `CNAME` record for `euginebhebhe` pointing at the Netlify site in
  your DNS provider.

Either works — it's a DNS/hosting preference, not a code change.

## 4. Design system reference

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0B0E11` | `#F5F6F4` |
| `--paper` (case-study panel) | `#F6F3EC` | `#14181C` |
| `--teal` (accent) | `#2FA793` | `#1D7566` |
| `--amber` (accent) | `#E8A33D` | `#8C6114` |

Type: **Space Grotesk** (headings), **IBM Plex Mono** (labels/data/eyebrows),
**Work Sans** (body). The case-study panels deliberately invert — dark panel
on a light page, light panel on a dark page — that's the signature visual
device; keep it when extending rather than flattening it to one style.

## 5. Concrete next steps to make it stand out further

In priority order — each is independently shippable:

1. **SEO + social preview.** Add `<meta name="description">`, Open Graph
   tags (`og:title`, `og:image`, `og:description`), and a favicon. Right
   now a link shared on LinkedIn/WhatsApp will show nothing useful — this
   is the single highest-leverage fix for a job-search asset.
2. **Lighthouse pass.** Run Chrome DevTools → Lighthouse. Target 90+ on
   Performance and Accessibility. The likely culprits: Google Fonts
   render-blocking (consider `font-display: swap`, already partially
   handled) and missing `alt` text if images are added later.
3. **Admin view for contact messages.** Right now messages land in the
   Supabase table editor only. A tiny password-gated page (or just a
   Supabase dashboard bookmark) that lists recent `portfolio_messages`
   rows would close the loop.
4. **Rate-limit the visitor counter.** Currently it increments on every
   page load with no de-duplication — fine for a personal portfolio, but
   if this matters, add a Supabase Edge Function that checks a hashed
   IP+day key before incrementing, instead of doing it client-side.
5. **A short "writing" or "notes" section.** Two or three short technical
   posts (e.g., "the `pgcrypto` schema bug" or "why Pfumvudza basin logic
   needed region-specific rules") turn debugging stories already on the
   page into standalone proof of written communication — a skill CVs
   rarely demonstrate directly.
6. **Real metrics once available.** The copy currently avoids invented
   numbers on purpose. As soon as Metups/MDUMENI have real usage data
   (signups, listings, active users), replace the qualitative claims with
   numbers — this is the highest-impact content change available, just
   gated on the data existing.
7. **CI/deploy pipeline.** If this moves into the Metups repo, wire a
   simple GitHub Actions check (HTML validation, broken-link check) before
   deploy — small, but it's another concrete "I do this properly" signal
   for a technical reviewer who looks at the repo.

## 6. Testing checklist before sharing the link publicly

- [ ] Anon key pasted in, counter shows a real number
- [ ] Contact form submits successfully and a row appears in
      `portfolio_messages`
- [ ] Résumé button downloads the correct, current PDF
- [ ] Toggle theme — check both light and dark on the case-study panels,
      nav, and form inputs
- [ ] Resize to mobile width (375px) — dashboard rows and case-study
      fields should stack, not overflow
- [ ] Tab through the whole page with keyboard only — every interactive
      element should get a visible focus ring
- [ ] Test with `prefers-reduced-motion` enabled — reveal animations and
      the pulse dot should stop animating
