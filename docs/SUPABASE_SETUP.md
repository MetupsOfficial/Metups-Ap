# Metups — Supabase Setup Checklist

Complete step-by-step guide to go from a blank Supabase project to a fully working Metups deployment.

---

## Prerequisites

- [Supabase account](https://app.supabase.com) — free tier is fine to start
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install -g supabase`)
- [Resend account](https://resend.com) for email (free tier: 3,000 emails/month)
- [Twilio account](https://twilio.com) for SMS (optional — only needed if you enable SMS notifications)

---

## Step 1 — Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) → **New Project**
2. Set a strong database password — **save it somewhere safe**
3. Choose the region closest to your users (e.g. `af-south-1` for Africa)
4. Wait ~2 minutes for the project to provision

---

## Step 2 — Copy Your Credentials

Go to **Settings → API** in your project dashboard and copy:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | "Project URL" |
| `SUPABASE_ANON_KEY` | "anon public" key |

Open `Authentication/supabase.js` and paste them:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhb...';
```

---

## Step 3 — Run the Database Migration

1. In your Supabase dashboard go to **SQL Editor**
2. Click **New query**
3. Open `supabase/metups_migration.sql` from your project folder
4. Paste the entire contents and click **Run** (▶)
5. You should see `Success. No rows returned`

Then run the increment_unread helper:

1. Open `supabase/increment_unread.sql`
2. Paste into a new SQL Editor query and click **Run**

**Verify it worked** — go to **Table Editor** and confirm you see these tables:

- `profiles`
- `products`
- `product_images`
- `conversations`
- `messages`
- `wishlists`
- `reviews`
- `notifications`
- `cart`

---

## Step 4 — Create Storage Buckets

Go to **Storage** in the left sidebar, click **New bucket** for each:

### Bucket 1: `product_images`
| Setting | Value |
|---|---|
| Name | `product_images` |
| Public bucket | ✅ Yes |
| Max file size | `5242880` (5 MB) |
| Allowed MIME types | `image/jpeg, image/png, image/webp, image/gif` |

### Bucket 2: `avatars`
| Setting | Value |
|---|---|
| Name | `avatars` |
| Public bucket | ✅ Yes |
| Max file size | `2097152` (2 MB) |
| Allowed MIME types | `image/jpeg, image/png, image/webp` |

### Bucket 3: `messages`
| Setting | Value |
|---|---|
| Name | `messages` |
| Public bucket | ❌ No (private) |
| Max file size | `10485760` (10 MB) |
| Allowed MIME types | `image/jpeg, image/png, image/webp, audio/webm, audio/mp4` |

### Storage RLS Policies

After creating each bucket, go to **Storage → Policies** and add these:

#### `product_images` bucket policies
```sql
-- Anyone can view product images (bucket is public)
-- SELECT is handled automatically by public bucket setting

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product_images' AND
  (storage.foldername(name))[1] = 'users' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can delete their own images
CREATE POLICY "Users delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product_images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

#### `avatars` bucket policies
```sql
-- Authenticated users can upload their own avatar
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name = auth.uid()::text || '.' || (regexp_match(name, '\.([^.]+)$'))[1]
);

-- Users can update (upsert) their own avatar
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());
```

#### `messages` bucket policies
```sql
-- Only conversation participants can upload message media
CREATE POLICY "Participants upload message media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'messages' AND
  (storage.foldername(name))[1] = 'conversations'
);

-- Participants can view message media
CREATE POLICY "Participants view message media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'messages');
```

---

## Step 5 — Configure Authentication

Go to **Authentication → Providers**:

### Email (required)
- ✅ Enable email provider
- Set **Confirm email**: enabled (users must verify email)
- Set **Secure email change**: enabled

### Google OAuth (optional)
1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
2. Add your domain to Authorized JavaScript origins
3. Add `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback` to Authorized redirect URIs
4. Paste Client ID and Client Secret in Supabase → Authentication → Google

### Facebook OAuth (optional)
1. Create an app at [developers.facebook.com](https://developers.facebook.com)
2. Add `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback` as a Valid OAuth Redirect URI
3. Paste App ID and App Secret in Supabase → Authentication → Facebook

### Email Templates (optional but recommended)
Go to **Authentication → Email Templates** and update:

- **Confirm signup** — customize with Metups branding
- **Reset password** — customize with Metups branding

Set your **Site URL** under **Authentication → URL Configuration**:
```
https://yourdomain.com
```

Add redirect URLs:
```
https://yourdomain.com/Authentication/index.html
https://yourdomain.com/Authentication/confirm.html
http://localhost:3000/Authentication/index.html  ← for local dev
```

---

## Step 6 — Deploy Edge Functions

Install the Supabase CLI and log in:

```bash
npm install -g supabase
supabase login
```

Link your project (get the project ref from **Settings → General**):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy all 3 functions:

```bash
supabase functions deploy send-email
supabase functions deploy send-sms
supabase functions deploy send-wishlist-match
```

Verify deployment in **Dashboard → Edge Functions** — all 3 should show as Active.

---

## Step 7 — Set Edge Function Environment Variables

Go to **Dashboard → Edge Functions → Manage secrets** and add:

| Secret name | Value | Required? |
|---|---|---|
| `RESEND_API_KEY` | Your Resend API key (`re_...`) | ✅ Yes |
| `FROM_EMAIL` | Your verified sender email | ✅ Yes |
| `APP_URL` | `https://yourdomain.com` | ✅ Yes |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | ⚡ If SMS enabled |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | ⚡ If SMS enabled |
| `TWILIO_PHONE_NUMBER` | Your Twilio number (E.164) | ⚡ If SMS enabled |

### Setting up Resend

1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys → Create API Key**
3. Add your sending domain under **Domains** and verify the DNS records
4. Set `FROM_EMAIL` to `no-reply@yourdomain.com` (must be on your verified domain)

---

## Step 8 — Verify Everything Works

### Test database
In the SQL Editor, run:
```sql
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM products;
```
Both should return 0 (empty, ready for data).

### Test auth
Open your app's `signup.html` and create a test account. Check **Authentication → Users** — you should see the new user appear within seconds.

### Test storage
Open `add_product.html`, list a test item with a photo. Go to **Storage → product_images** — you should see the uploaded file at `users/USER_ID/PRODUCT_ID/filename.jpg`.

### Test Edge Functions
In your browser console on any page, run:
```js
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    to: 'your@email.com',
    subject: 'Test',
    message: 'Metups Edge Functions are working!',
    actionUrl: 'https://yourdomain.com'
  })
}).then(r => r.json()).then(console.log);
```
You should receive the test email within a few seconds.

### Test real-time messaging
1. Open the app in two different browser windows (logged in as two different users)
2. From user A's product, user B clicks "Message Seller"
3. User B types a message and sends
4. User A should see it appear in real time without refreshing

---

## Step 9 — Go Live Checklist

Before launching publicly:

- [ ] Domain configured and pointing to your hosting
- [ ] `APP_URL` env variable updated to production domain
- [ ] Supabase **Site URL** updated to production domain
- [ ] All OAuth redirect URLs updated to production domain
- [ ] `RESEND_API_KEY` set to a production key (not a test key)
- [ ] Sender email domain verified in Resend
- [ ] Storage bucket policies reviewed
- [ ] RLS enabled on all tables (run `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'` — all should be `true`)
- [ ] Remove `console.log` debug statements from `index.html`
- [ ] PWA manifest and service worker deployed (see `manifest.json` / `sw.js`)

---

## Quick Reference — Project File Structure

```
your-project/
├── Authentication/
│   ├── index.html          ← Home / browse page
│   ├── login.html
│   ├── signup.html
│   ├── confirm.html
│   ├── supabase.js         ← ⚠️  Put your credentials here
│   ├── utils.js
│   ├── auth.js
│   └── styles.css
├── Dashboard/
│   ├── dashboard.html      ← My Listings
│   ├── product.html
│   ├── add_product.html
│   ├── profile.html
│   ├── notifications.html
│   ├── menu.html
│   ├── settings.html
│   ├── wishlist.html
│   ├── add_wishlist.html
│   ├── products.js
│   ├── dashboard.js
│   └── wishlist.js
├── Messaging/
│   ├── messaging.html
│   └── messaging.js
├── supabase/
│   ├── metups_migration.sql
│   ├── increment_unread.sql
│   └── functions/
│       ├── send-email/index.ts
│       ├── send-sms/index.ts
│       └── send-wishlist-match/index.ts
├── manifest.json           ← PWA
├── sw.js                   ← Service Worker
└── icons/                  ← PWA icons (192×192 and 512×512)
    ├── icon-192.png
    └── icon-512.png
```