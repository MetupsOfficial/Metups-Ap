-- ================================================================
-- METUPS — RLS DIAGNOSTIC + FIX SCRIPT
-- supabase/fix_rls_and_policies.sql
--
-- Run this in Supabase SQL Editor to:
--   1. See what policies currently exist (causes of conflicts)
--   2. Drop all conflicting/duplicate policies
--   3. Re-create correct, minimal policies
--   4. Fix storage bucket policies for avatars + product_images
--   5. Backfill pre-existing profiles (missing columns)
--   6. Enable realtime
--
-- Safe to run on a live database — uses DROP IF EXISTS.
-- ================================================================


-- ================================================================
-- STEP 1: DIAGNOSE — see existing RLS policies
-- (read the output before running the rest)
-- ================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- STEP 2: DROP ALL EXISTING POLICIES (prevents "already exists" errors)
-- Run this block if you see duplicate policy names above.
-- ================================================================

-- profiles
DROP POLICY IF EXISTS "profiles_select_public"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"      ON profiles;
-- catch any old names
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile."       ON profiles;
DROP POLICY IF EXISTS "Users can update own profile."            ON profiles;

-- products
DROP POLICY IF EXISTS "products_select_active"  ON products;
DROP POLICY IF EXISTS "products_insert_auth"    ON products;
DROP POLICY IF EXISTS "products_update_own"     ON products;
DROP POLICY IF EXISTS "products_delete_own"     ON products;

-- product_images
DROP POLICY IF EXISTS "product_images_select"        ON product_images;
DROP POLICY IF EXISTS "product_images_insert_owner"  ON product_images;
DROP POLICY IF EXISTS "product_images_delete_owner"  ON product_images;

-- conversations
DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_buyer"       ON conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON conversations;

-- messages
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
DROP POLICY IF EXISTS "messages_update_recipient"   ON messages;

-- wishlists
DROP POLICY IF EXISTS "wishlists_own"     ON wishlists;

-- reviews
DROP POLICY IF EXISTS "reviews_select"      ON reviews;
DROP POLICY IF EXISTS "reviews_insert_auth" ON reviews;

-- notifications
DROP POLICY IF EXISTS "notifications_own"  ON notifications;

-- cart
DROP POLICY IF EXISTS "cart_own"           ON cart;


-- ================================================================
-- STEP 3: RE-CREATE CORRECT RLS POLICIES
-- ================================================================

-- ── profiles ────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);


-- ── products ────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products; sellers can always see their own
CREATE POLICY "products_select_active"
  ON products FOR SELECT
  USING (is_active = true OR seller_id = auth.uid());

-- Authenticated users can insert (seller_id must equal their own ID)
CREATE POLICY "products_insert_auth"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update / soft-delete their own listings
CREATE POLICY "products_update_own"
  ON products FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "products_delete_own"
  ON products FOR DELETE
  USING (auth.uid() = seller_id);


-- ── product_images ───────────────────────────────────────────────
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "product_images_select"
  ON product_images FOR SELECT USING (true);

-- Only the product owner can insert images
CREATE POLICY "product_images_insert_owner"
  ON product_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Only the product owner can delete images
CREATE POLICY "product_images_delete_owner"
  ON product_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );


-- ── conversations ────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Only participants can see their conversations
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Buyer creates the conversation (buyer_id must be themselves)
CREATE POLICY "conversations_insert_buyer"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Either participant can update (e.g. mark read, update unread_count)
CREATE POLICY "conversations_update_participant"
  ON conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- ── messages ─────────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Both participants can read messages in their conversation
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Either participant can send a message (sender_id must be themselves)
CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Recipient can mark messages delivered/read
CREATE POLICY "messages_update_recipient"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );


-- ── wishlists ────────────────────────────────────────────────────
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlists_own"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── reviews ──────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews_insert_auth"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);


-- ── notifications ────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── cart ─────────────────────────────────────────────────────────
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_own"
  ON cart FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ================================================================
-- STEP 4: STORAGE BUCKET POLICIES
-- Run these after creating the 3 buckets in the Supabase dashboard:
--   product_images (public), avatars (public), messages (private)
-- ================================================================

-- ── product_images bucket ────────────────────────────────────────

-- Drop old policies first
DROP POLICY IF EXISTS "Users upload own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own product images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

-- Anyone can view (bucket is public, but policy still needed for anon)
CREATE POLICY "product_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product_images');

-- Authenticated users can upload to their own folder:
-- path must be: users/{auth.uid()}/...
CREATE POLICY "product_images_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can update their own images
CREATE POLICY "product_images_update_owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own images
CREATE POLICY "product_images_delete_owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product_images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );


-- ── avatars bucket ───────────────────────────────────────────────

DROP POLICY IF EXISTS "Users upload own avatar"         ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar"         ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;

-- Public read (bucket is public)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Upload: path must start with the user's own UUID
-- The app uses: avatars/{auth.uid()}.{ext}
CREATE POLICY "avatars_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
  );

-- Allow upsert (the app uses { upsert: true })
CREATE POLICY "avatars_update_owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
  );

-- Delete own avatar
CREATE POLICY "avatars_delete_owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
  );


-- ── messages bucket (private — voice + image attachments) ─────────

DROP POLICY IF EXISTS "Participants upload message media" ON storage.objects;
DROP POLICY IF EXISTS "Participants view message media"   ON storage.objects;

-- Only authenticated users can read chat media
CREATE POLICY "messages_media_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'messages');

-- Authenticated users can upload chat media
CREATE POLICY "messages_media_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'messages'
    AND (storage.foldername(name))[1] = 'conversations'
  );


-- ================================================================
-- STEP 5: BACKFILL PRE-EXISTING PROFILES
-- If you created accounts before running add_location_columns.sql,
-- those columns may not exist. This safely adds them.
-- ================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS country      TEXT,
  ADD COLUMN IF NOT EXISTS country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng          DOUBLE PRECISION;

-- Backfill: if a profile has a location string "Harare, Zimbabwe"
-- but no city/country, try to parse it
UPDATE profiles
SET
  city    = trim(split_part(location, ',', 1)),
  country = trim(split_part(location, ',', 2))
WHERE
  location IS NOT NULL
  AND city IS NULL
  AND location LIKE '%,%';


-- ================================================================
-- STEP 6: MAKE SURE REALTIME IS ENABLED
-- ================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ================================================================
-- STEP 7: VERIFY — run this at the end to confirm all policies exist
-- ================================================================
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;