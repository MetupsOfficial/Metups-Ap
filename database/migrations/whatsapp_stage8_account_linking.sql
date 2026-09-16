-- WhatsApp Stage 8: prevent a phone number from resolving to multiple profiles.
-- First inspect duplicate phones; resolve any rows returned before applying the
-- unique index, rather than silently choosing an account for a seller.
SELECT phone, count(*) AS profile_count
FROM profiles
WHERE phone IS NOT NULL
GROUP BY phone
HAVING count(*) > 1;

-- Run this after the query above returns no rows.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON profiles (phone)
  WHERE phone IS NOT NULL;
