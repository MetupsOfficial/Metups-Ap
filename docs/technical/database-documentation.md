# Database Documentation

| Field | Value |
|-------|-------|
| **Document ID** | TECH-004 |
| **Version** | 1.0.0 |
| **Owner** | Engineering |
| **Last Reviewed** | 2026-05-29 |
| **Next Review** | 2026-11-29 |
| **Approved By** | [CTO] |

---

## Revision History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-05-29 | [Engineering] | Initial documentation |

---

## Overview

Metups uses **PostgreSQL** hosted on **Supabase**. The database is the single source of truth for all application data. All tables have Row Level Security (RLS) enabled. Migration files are in `supabase/`.

**Database Engine:** PostgreSQL 15+  
**Hosting:** Supabase (AWS us-east-1)  
**Extensions:** `uuid-ossp`, `pg_trgm`

---

## Schema Overview

```
auth.users (Supabase managed)
    ↑ 1:1
profiles
    ↑ 1:many
    ├── products (listings)
    ├── conversations (as seller or buyer)
    ├── messages
    ├── wishlist
    ├── ratings (given and received)
    └── notifications

products
    ↑ many:many (via wishlist)
    └── wishlist
    ↑ 1:1 (optional)
    └── conversations
```

---

## Table Reference

### `profiles`
Extends `auth.users`. Created automatically on user sign-up via trigger.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users | Supabase user ID |
| username | TEXT | UNIQUE, NOT NULL | Display name |
| email | TEXT | NOT NULL | User email |
| avatar_url | TEXT | | Profile photo URL |
| phone | TEXT | UNIQUE | Phone number |
| phone_verified | BOOLEAN | DEFAULT false | SMS verification status |
| date_of_birth | DATE | | User DOB |
| country | TEXT | DEFAULT 'Zimbabwe' | |
| city | TEXT | | Current city |
| notification_preferences | JSONB | DEFAULT {...} | {email, sms, push} flags |
| rating_avg | NUMERIC(3,2) | DEFAULT 0 | Cached average rating |
| rating_count | INTEGER | DEFAULT 0 | Total ratings received |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Soft delete flag |
| last_seen_at | TIMESTAMPTZ | | Last online timestamp |
| created_at | TIMESTAMPTZ | DEFAULT now() | Account creation |

**Indexes:** `idx_profiles_phone`  
**RLS:** Users can read all profiles; only update their own.

---

### `products`
Core listings table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | |
| seller_id | UUID | FK → profiles(id) ON DELETE CASCADE | |
| title | TEXT | NOT NULL | Listing title |
| description | TEXT | NOT NULL | Full description |
| price | NUMERIC | NOT NULL, CHECK >= 0 | Price in USD |
| category | TEXT | | Item category |
| condition | TEXT | | e.g., 'Like New', 'Good', 'Fair' |
| location | TEXT | | City/area |
| images | TEXT[] | | Array of storage URLs |
| sold | BOOLEAN | DEFAULT false | Whether item is sold |
| sold_price | NUMERIC | | Actual price agreed |
| sold_to_id | UUID | FK → profiles | Buyer |
| sold_at | TIMESTAMPTZ | | Sale timestamp |
| views_count | INTEGER | DEFAULT 0 | View counter |
| is_active | BOOLEAN | DEFAULT true | Soft delete |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last edit |
| created_at | TIMESTAMPTZ | DEFAULT now() | Listing creation |
| search_vector | TSVECTOR | | Full-text search (auto-updated) |

**Indexes:** `idx_products_seller`, `idx_products_category`, `idx_products_location`, `idx_products_created`, `idx_products_sold`, `idx_products_search` (GIN)  
**Triggers:** `update_products_search_vector` — auto-updates `search_vector` on insert/update  
**RLS:** Public read (authenticated); insert/update/delete own listings only.

---

### `conversations`
Chat threads between two users about a specific product (optional).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| product_id | UUID | FK → products (nullable) | Related listing |
| seller_id | UUID | FK → profiles | |
| buyer_id | UUID | FK → profiles | |
| last_message | TEXT | | Snippet of last message |
| last_message_at | TIMESTAMPTZ | | |
| seller_unread | INTEGER | DEFAULT 0 | Unread count for seller |
| buyer_unread | INTEGER | DEFAULT 0 | Unread count for buyer |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**RLS:** Participants (seller or buyer) can read and update their own conversations.

---

### `messages`
Individual messages within a conversation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| conversation_id | UUID | FK → conversations ON DELETE CASCADE | |
| sender_id | UUID | FK → profiles | |
| content | TEXT | NOT NULL | Message text |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**RLS:** Conversation participants only.  
**Realtime:** Subscribed for live updates.

---

### `wishlist`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → profiles | |
| product_id | UUID | FK → products | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| UNIQUE | | (user_id, product_id) | No duplicates |

**RLS:** Users can only see and modify their own wishlist.

---

### `notifications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| user_id | UUID | FK → profiles | Recipient |
| type | TEXT | | e.g., 'new_message', 'item_sold' |
| title | TEXT | | Notification headline |
| body | TEXT | | Full text |
| is_read | BOOLEAN | DEFAULT false | |
| link | TEXT | | Deep link URL |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## Database Functions

### `increment_unread(conversation_id, role)`
Atomically increments the unread message counter for the specified participant.

```sql
-- Source: supabase/increment_unread.sql
```

### `update_products_search_vector()`
Trigger function that updates the `search_vector` column on products using weighted full-text search (title=A, description=B, category=C, location=C).

---

## Migrations

| File | Description |
|------|-------------|
| `supabase/metups_migration.sql` | Full schema — run once on new project |
| `supabase/fix_rls_and_policies.sql` | RLS policy definitions |
| `supabase/increment_unread.sql` | Utility function for chat unread counts |

**To run migrations:**
1. Open Supabase Dashboard → SQL Editor
2. Paste migration content and run
3. Or use Supabase CLI: `supabase db push`

---

## Performance Notes

- Full-text search uses `search_vector` GIN index — very fast for keyword searches
- `rating_avg` and `rating_count` are cached on `profiles` — updated via trigger on rating change
- `views_count` is incremented using atomic SQL to prevent race conditions
- All foreign keys have appropriate ON DELETE behaviour to prevent orphan records
