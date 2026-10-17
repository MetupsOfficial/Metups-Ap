-- Return only lifecycle fields needed to give removed listing URLs a real
-- 410 response. Public clients cannot read inactive products under RLS.
CREATE OR REPLACE FUNCTION public.metups_seo_product_status(listing_id uuid)
RETURNS TABLE (is_active boolean, sold boolean, sold_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_active, p.sold, p.sold_at
  FROM public.products AS p
  WHERE p.id = listing_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.metups_seo_product_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.metups_seo_product_status(uuid) TO anon, authenticated;

-- The listing renderer needs a small public projection with the cover image.
-- Keep seller/profile fields out of this endpoint and cap each page at 1,000.
CREATE OR REPLACE FUNCTION public.metups_seo_public_listings(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 24,
  p_category text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  condition text,
  location text,
  category text,
  sold boolean,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  sold_at timestamptz,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.description, p.price, p.condition, p.location,
         p.category, p.sold, p.is_active, p.created_at, p.updated_at,
         p.sold_at, cover.image_url
  FROM public.products AS p
  LEFT JOIN LATERAL (
    SELECT pi.image_url
    FROM public.product_images AS pi
    WHERE pi.product_id = p.id
    ORDER BY pi.image_order ASC, pi.created_at ASC
    LIMIT 1
  ) AS cover ON true
  WHERE p.is_active = true
    AND p.sold = false
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_city IS NULL OR p.location = p_city)
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC, p.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 24), 1), 1000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

-- Aggregate only public, active, unsold listings so page rendering and sitemap
-- generation need one small request instead of scanning thousands of rows.
CREATE OR REPLACE FUNCTION public.metups_seo_public_facets()
RETURNS TABLE (kind text, name text, listing_count bigint, lastmod timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'category'::text, p.category, count(*), max(p.updated_at)
  FROM public.products AS p
  WHERE p.is_active = true AND p.sold = false AND p.category IS NOT NULL
  GROUP BY p.category
  HAVING count(*) >= 3
  UNION ALL
  SELECT 'city'::text, p.location, count(*), max(p.updated_at)
  FROM public.products AS p
  WHERE p.is_active = true AND p.sold = false AND p.location IS NOT NULL
  GROUP BY p.location
  HAVING count(*) >= 3
  UNION ALL
  SELECT 'total'::text, NULL::text, count(*), NULL::timestamptz
  FROM public.products AS p
  WHERE p.is_active = true AND p.sold = false;
$$;

CREATE OR REPLACE FUNCTION public.metups_seo_category_city_facets()
RETURNS TABLE (category text, city text, listing_count bigint, lastmod timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.category, p.location, count(*), max(p.updated_at)
  FROM public.products AS p
  WHERE p.is_active = true AND p.sold = false
    AND p.category IS NOT NULL AND p.location IS NOT NULL
  GROUP BY p.category, p.location
  HAVING count(*) >= 3;
$$;

REVOKE ALL ON FUNCTION public.metups_seo_public_listings(integer, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.metups_seo_public_facets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.metups_seo_category_city_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.metups_seo_public_listings(integer, integer, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metups_seo_public_facets() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metups_seo_category_city_facets() TO anon, authenticated;
