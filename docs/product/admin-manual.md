# Admin Manual

| Field | Value |
|-------|-------|
| **Document ID** | PROD-006 |
| **Version** | 1.0.0 |
| **Owner** | Engineering / Operations |
| **Last Reviewed** | 2026-05-29 |
| **Classification** | Internal |
| **Approved By** | [CTO] |

---

## Admin Tools

Metups administration is performed via:
1. **Supabase Dashboard** — database, auth, storage management
2. **Cloudflare Dashboard** — deployment, analytics, headers
3. **Email** — customer support and trust operations
4. **[Future: Internal admin panel]**

---

## User Management (Supabase)

### View All Users
Supabase Dashboard → Authentication → Users

| Column | Description |
|--------|-------------|
| Email | User's registered email |
| Provider | email or google |
| Created | Registration date |
| Last Sign In | Most recent login |
| Status | Active / Banned |

### Disable a User Account
1. Authentication → Users → Find user
2. Click user → **"Disable"** (prevents login)
3. Document reason in support ticket

### Re-enable a User Account
1. Authentication → Users → Find user
2. Click user → **"Enable"**

### Delete a User Account
1. Authentication → Users → Find user
2. Delete — cascades to `profiles` and `products` via FK
3. This is **permanent** — confirm with user first

### Find User by Email (SQL)
```sql
SELECT p.*, au.email, au.last_sign_in_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'user@example.com';
```

---

## Listing Management

### View All Listings
Supabase → Table Editor → `products`

### Deactivate a Listing (Soft Delete)
```sql
UPDATE products SET is_active = false WHERE id = '[LISTING_ID]';
```

### Deactivate All Listings for a User (Spam/Ban)
```sql
UPDATE products SET is_active = false WHERE seller_id = '[USER_ID]';
```

### Search Listings by Keyword
```sql
SELECT id, title, seller_id, created_at
FROM products
WHERE title ILIKE '%keyword%'
   OR description ILIKE '%keyword%';
```

### View Listings by Category
```sql
SELECT category, COUNT(*) as listing_count
FROM products
WHERE is_active = true
GROUP BY category
ORDER BY listing_count DESC;
```

---

## Moderation

### View Recent Reports
Reports are submitted via email to trust@metups.com and via in-app report button.

*[Future: Reports table in database — add schema if implemented]*

### Moderation Decision Logging
Log all moderation actions in the support ticket system with:
- User ID
- Listing ID (if applicable)
- Violation type
- Action taken
- Admin who took action
- Date

---

## Messaging Administration

### View Conversation (Admin Only — Service Role Key Required)
```sql
SELECT m.*, p.username as sender_name
FROM messages m
JOIN profiles p ON p.id = m.sender_id
WHERE m.conversation_id = '[CONV_ID]'
ORDER BY m.created_at;
```

**Warning:** Only access conversations when investigating a reported safety issue. Document the reason. Never access messages out of curiosity.

---

## Storage Administration

### Supabase Storage → Buckets
- `product-images` — listing photos
- `avatars` — profile photos

### Delete Image
1. Storage → product-images
2. Navigate to user's folder
3. Delete specific file

### Storage Usage
Storage → Usage tab shows current storage consumption.

---

## Database Metrics

### User Growth
```sql
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_users
FROM profiles
GROUP BY 1
ORDER BY 1;
```

### Listing Activity
```sql
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_listings,
  SUM(CASE WHEN sold THEN 1 ELSE 0 END) as sold_listings
FROM products
GROUP BY 1
ORDER BY 1;
```

### Top Sellers
```sql
SELECT p.username, COUNT(pr.id) as listing_count, p.rating_avg
FROM profiles p
JOIN products pr ON pr.seller_id = p.id
WHERE pr.is_active = true
GROUP BY p.id, p.username, p.rating_avg
ORDER BY listing_count DESC
LIMIT 20;
```

---

## Admin Access Levels

See [Access Control Policy](../security/access-control-policy.md).  
Admin access to Supabase dashboard requires MFA.

---

## Emergency Actions

### Take Platform Offline (Emergency)
1. Cloudflare → Site → Settings → **"Stop auto publishing"** does not take site offline
2. To truly take offline: replace `frontend/index.html` with a maintenance page and deploy
3. Alternative: Supabase → Settings → **Pause project** (prevents all API calls)

### Resume from Maintenance
1. Restore original `index.html` via Cloudflare deploy or git revert
2. Or: Supabase → Settings → **Resume project**
