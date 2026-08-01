# Metups — Edge Functions & PWA Deployment Guide

---

## Why you're getting RLS errors

**Short answer: yes — pre-existing accounts cause this.**

When you created accounts before running the full migration, Supabase's default
auth trigger created minimal profile rows. Then when you ran the migration later,
these things happened:

| Problem | Cause | Fix |
|---|---|---|
| `messages` INSERT blocked | Policy requires participant check on `conversations` — but if the conversation was created before RLS was enabled, the check fails | Re-run `fix_rls_and_policies.sql` |
| Avatar upload blocked | Storage policy expects path `avatars/{uid}.jpg` but old code may have used a different path format | Re-run storage policies in `fix_rls_and_policies.sql` |
| `city`/`country` columns missing | `add_location_columns.sql` wasn't run before profiles were created | Covered in Step 5 of `fix_rls_and_policies.sql` |
| Duplicate policy error | Migration ran twice, or old default policies conflict | Step 2 of `fix_rls_and_policies.sql` drops all old ones first |

**Run `supabase/fix_rls_and_policies.sql` in your SQL Editor first.
That fixes everything in one go.**

---

## Part 1 — Edge Functions

### Prerequisites
```bash
npm install -g supabase
supabase login        # opens browser to authenticate
supabase link --project-ref YOUR_PROJECT_REF
# Find project ref: Supabase dashboard → Settings → General → Reference ID
```

### Deploy all 3 functions
```bash
supabase functions deploy send-email
supabase functions deploy send-sms
supabase functions deploy send-wishlist-match
```

Verify in dashboard: **Edge Functions** tab — all 3 should show a green **Active** badge.

---

### Set secrets (environment variables)

In the Supabase dashboard go to **Edge Functions → Manage secrets**, or use CLI:

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set FROM_EMAIL=no-reply@yourdomain.com
supabase secrets set APP_URL=https://yourdomain.com

# Only needed if you want SMS notifications:
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=+263771234567
```

---

### Test each function

Open your browser console on any page of your live app and run:

**Test send-email:**
```js
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    to: 'your@email.com',
    subject: 'Test from Metups',
    message: 'Edge Functions are working!',
    actionUrl: 'https://yourdomain.com'
  })
}).then(r => r.json()).then(console.log);
```

**Expected response:** `{ success: true, id: "email-provider-message-id" }`

**Test send-sms (if Twilio configured):**
```js
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    to: '+263771234567',
    message: 'Test SMS from Metups'
  })
}).then(r => r.json()).then(console.log);
```

---

### Common Edge Function errors

| Error | Cause | Fix |
|---|---|---|
| `503 Email service not configured` | `RESEND_API_KEY` secret not set | Run `supabase secrets set RESEND_API_KEY=re_...` |
| `502 Failed to send email` | Wrong API key, or `FROM_EMAIL` domain not verified in Resend | Verify domain at resend.com/domains |
| `401 Unauthorized` | Missing or wrong `Authorization` header | Add `Authorization: Bearer YOUR_ANON_KEY` header |
| `404 Not Found` | Function not deployed, or wrong URL | Check function is Active in dashboard |
| CORS error in browser | Calling function from wrong origin | Functions already have `Access-Control-Allow-Origin: *` — check the URL is correct |
| `400 Invalid recipient` | Email address malformed | Check `to` field is a valid email |

---

### How the app calls Edge Functions

The app calls functions via `auth.js` → `sendNotification()`. The function URL
it uses is relative: `/functions/v1/send-email`. This only works if your HTML
is served from the **same domain** as your Supabase project, OR if you're using
a custom domain.

If you're hosting on Cloudflare/Vercel (a **different** domain from Supabase), you
need to use the full Supabase URL. Update `auth.js`:

```js
// In sendNotification() — replace relative paths with full URLs:
const SUPABASE_FUNCTIONS_URL = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1';

// Then:
fetch(`${SUPABASE_FUNCTIONS_URL}/send-email`, { ... })
fetch(`${SUPABASE_FUNCTIONS_URL}/send-sms`,   { ... })
```

---

## Part 2 — PWA (Progressive Web App)

### What you need at your domain root

```
/                       ← your domain root
├── sw.js               ← service worker (MUST be at root)
├── manifest.json       ← web app manifest (MUST be at root)
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png    ← minimum required for Android install
│   └── icon-512.png    ← minimum required for splash screen
├── Authentication/
│   ├── index.html
│   └── ...
├── Dashboard/
└── Messaging/
```

**Important:** `sw.js` and `manifest.json` must be at the **root of your domain**,
not inside a subfolder. A service worker at `/Authentication/sw.js` can only
control pages under `/Authentication/`, which is wrong.

---

### Create PWA icons

You need your Metups logo exported at 8 sizes. The quickest way:

**Option A — Online tool (no install):**
1. Go to [realfavicongenerator.net](https://realfavicongenerator.net)
2. Upload your logo (the one at `frontend/assets/icons/Metups_logo-512.png`)
3. Download the package → rename files to match the sizes above

**Option B — Using ImageMagick (if installed):**
```bash
# Download your logo
curl -o logo.png "frontend/assets/icons/Metups_logo-512.png"

# Generate all sizes
for size in 72 96 128 144 152 192 384 512; do
  magick logo.png -resize ${size}x${size} icons/icon-${size}.png
done
```

**Option B2 — Using sharp (Node.js):**
```bash
npm install sharp
node -e "
const sharp = require('sharp');
[72,96,128,144,152,192,384,512].forEach(s =>
  sharp('logo.png').resize(s,s).toFile(\`icons/icon-\${s}.png\`, ()=>{})
);"
```

---

### Cloudflare deployment

Create a `wrangler.jsonc` at your project root:

```toml
[build]
  publish = "."

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

Then drag-and-drop your project folder into [dash.cloudflare.com](https://dash.cloudflare.com/drop).

---

### Vercel deployment

Create a `vercel.json` at your project root:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

Then run `vercel --prod` from your project folder.

---

### Test the PWA install

1. Open your live site in Chrome on Android
2. Open Chrome menu (⋮) → **Add to Home screen**
3. If the prompt doesn't appear, open DevTools → **Application → Manifest** — any
   errors there explain why install is blocked

**Common PWA install blockers:**
| Issue | Fix |
|---|---|
| `sw.js` not found | Move `sw.js` to domain root — not in a subfolder |
| Manifest not found | Move `manifest.json` to domain root |
| Icons not found | Create `icons/` folder at domain root with all 8 sizes |
| Not served over HTTPS | PWA requires HTTPS — Cloudflare/Vercel both provide this free |
| `start_url` returns 404 | Update `manifest.json` → `start_url` to match your actual home page path |

---

### Verify service worker is active

In Chrome DevTools → **Application → Service Workers** you should see:
- Status: **activated and running**
- Source: `/sw.js`

If it shows an error, check the Console tab — the most common issue is a
pre-cache asset returning 404 (e.g. an icon file that doesn't exist yet).

The service worker in `sw.js` handles this gracefully — it uses
`Promise.allSettled()` so a missing pre-cache file won't block the install.

---

## Quick fix checklist

Run through this in order:

```
[ ] 1. Run fix_rls_and_policies.sql in Supabase SQL Editor
        → Fixes all RLS errors for messages and avatar upload

[ ] 2. Create 3 storage buckets in Supabase dashboard:
        → product_images (Public)
        → avatars (Public)
        → messages (Private)
        → Storage policies are in fix_rls_and_policies.sql Steps 4

[ ] 3. Deploy Edge Functions:
        supabase functions deploy send-email
        supabase functions deploy send-sms
        supabase functions deploy send-wishlist-match

[ ] 4. Set Edge Function secrets in dashboard

[ ] 5. Create PWA icons at 8 sizes → put in /icons/ at domain root

[ ] 6. Deploy to Cloudflare or Vercel with sw.js + manifest.json at root

[ ] 7. Test: message a seller, upload avatar, install as home screen app
```