-- ============================================================
-- Product taxonomy: broad department + exact item type
--
-- Existing products retain their current broad category and receive the
-- explicit legacy type `other`. We do not infer a phone, laptop, etc. from
-- old listing text because an incorrect classification is worse than an
-- honest legacy label. New website listings must supply a canonical type.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_item_types (
  slug text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (category, label)
);

INSERT INTO public.product_item_types (slug, category, label, sort_order) VALUES
  ('smartphones', 'Electronics', 'Smartphones', 10),
  ('feature-phones', 'Electronics', 'Feature Phones', 20),
  ('tablets', 'Electronics', 'Tablets', 30),
  ('laptops', 'Electronics', 'Laptops', 40),
  ('desktop-computers', 'Electronics', 'Desktop Computers', 50),
  ('monitors', 'Electronics', 'Monitors', 60),
  ('televisions', 'Electronics', 'Televisions', 70),
  ('cameras', 'Electronics', 'Cameras', 80),
  ('smartwatches', 'Electronics', 'Smartwatches', 90),
  ('headphones-earphones', 'Electronics', 'Headphones & Earphones', 100),
  ('speakers', 'Electronics', 'Speakers', 110),
  ('gaming-consoles', 'Electronics', 'Gaming Consoles', 120),
  ('gaming-accessories', 'Electronics', 'Gaming Accessories', 130),
  ('computer-accessories', 'Electronics', 'Computer Accessories', 140),
  ('networking-equipment', 'Electronics', 'Networking Equipment', 150),
  ('printers-scanners', 'Electronics', 'Printers & Scanners', 160),
  ('chargers-cables', 'Electronics', 'Chargers & Cables', 170),
  ('fridges-freezers', 'Appliances', 'Fridges & Freezers', 10),
  ('washing-machines', 'Appliances', 'Washing Machines', 20),
  ('cookers-stoves', 'Appliances', 'Cookers & Stoves', 30),
  ('microwaves', 'Appliances', 'Microwaves', 40),
  ('air-conditioners', 'Appliances', 'Air Conditioners', 50),
  ('fans', 'Appliances', 'Fans', 60),
  ('vacuum-cleaners', 'Appliances', 'Vacuum Cleaners', 70),
  ('small-kitchen-appliances', 'Appliances', 'Small Kitchen Appliances', 80),
  ('sofas', 'Furniture', 'Sofas', 10),
  ('beds', 'Furniture', 'Beds', 20),
  ('mattresses', 'Furniture', 'Mattresses', 30),
  ('wardrobes', 'Furniture', 'Wardrobes', 40),
  ('dining-tables', 'Furniture', 'Dining Tables', 50),
  ('chairs', 'Furniture', 'Chairs', 60),
  ('desks', 'Furniture', 'Desks', 70),
  ('office-furniture', 'Furniture', 'Office Furniture', 80),
  ('cabinets-shelves', 'Furniture', 'Cabinets & Shelves', 90),
  ('cars', 'Vehicles', 'Cars', 10),
  ('motorcycles', 'Vehicles', 'Motorcycles', 20),
  ('bicycles', 'Vehicles', 'Bicycles', 30),
  ('trucks', 'Vehicles', 'Trucks', 40),
  ('vehicle-parts', 'Vehicles', 'Vehicle Parts', 50),
  ('tyres', 'Vehicles', 'Tyres', 60),
  ('mens-clothing', 'Fashion', 'Men''s Clothing', 10),
  ('womens-clothing', 'Fashion', 'Women''s Clothing', 20),
  ('childrens-clothing', 'Fashion', 'Children''s Clothing', 30),
  ('shoes', 'Fashion', 'Shoes', 40),
  ('bags', 'Fashion', 'Bags', 50),
  ('watches-jewellery', 'Fashion', 'Watches & Jewellery', 60),
  ('fiction-books', 'Books', 'Fiction Books', 10),
  ('textbooks', 'Books', 'Textbooks', 20),
  ('study-materials', 'Books', 'Study Materials', 30),
  ('power-tools', 'Home & Garden', 'Power Tools', 10),
  ('hand-tools', 'Home & Garden', 'Hand Tools', 20),
  ('garden-equipment', 'Home & Garden', 'Garden Equipment', 30),
  ('home-decor', 'Home & Garden', 'Home Decor', 40),
  ('baby-gear', 'Baby & Kids', 'Baby Gear', 10),
  ('toys-games', 'Baby & Kids', 'Toys & Games', 20),
  ('sports-equipment', 'Sports & Outdoors', 'Sports Equipment', 10),
  ('fitness-equipment', 'Sports & Outdoors', 'Fitness Equipment', 20),
  ('musical-instruments', 'Other', 'Musical Instruments', 10),
  ('electronics-other', 'Electronics', 'Other Electronics', 999),
  ('appliances-other', 'Appliances', 'Other Appliances', 999),
  ('furniture-other', 'Furniture', 'Other Furniture', 999),
  ('vehicles-other', 'Vehicles', 'Other Vehicles', 999),
  ('fashion-other', 'Fashion', 'Other Fashion', 999),
  ('books-other', 'Books', 'Other Books', 999),
  ('other', 'Other', 'Other / Unspecified', 999)
ON CONFLICT (slug) DO UPDATE
  SET category = EXCLUDED.category,
      label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      is_active = true;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS item_type text;

UPDATE public.products
SET item_type = CASE category
  WHEN 'Electronics' THEN 'electronics-other'
  WHEN 'Appliances' THEN 'appliances-other'
  WHEN 'Furniture' THEN 'furniture-other'
  WHEN 'Vehicles' THEN 'vehicles-other'
  WHEN 'Fashion' THEN 'fashion-other'
  WHEN 'Books' THEN 'books-other'
  ELSE 'other'
END
WHERE item_type IS NULL OR btrim(item_type) = '';

ALTER TABLE public.products
  ALTER COLUMN item_type SET DEFAULT 'other',
  ALTER COLUMN item_type SET NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_item_type_fkey;
ALTER TABLE public.products
  ADD CONSTRAINT products_item_type_fkey
  FOREIGN KEY (item_type) REFERENCES public.product_item_types(slug);

-- A product may not claim a broad category that disagrees with its exact type.
CREATE OR REPLACE FUNCTION public.enforce_product_item_type_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  expected_category text;
BEGIN
  SELECT category INTO expected_category
  FROM public.product_item_types
  WHERE slug = NEW.item_type AND is_active = true;

  IF expected_category IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive product item type: %', NEW.item_type;
  END IF;
  IF NEW.category IS DISTINCT FROM expected_category THEN
    RAISE EXCEPTION 'Product category % does not match item type %', NEW.category, NEW.item_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_item_type_category ON public.products;
CREATE TRIGGER trg_products_item_type_category
  BEFORE INSERT OR UPDATE OF category, item_type ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_product_item_type_category();

-- New exact filtering and WhatsApp product matching.
CREATE INDEX IF NOT EXISTS idx_products_active_item_type
  ON public.products (item_type, location, price, created_at DESC)
  WHERE is_active = true AND sold = false;

-- Add exact type to full-text search for website search/RPCs using the vector.
CREATE OR REPLACE FUNCTION public.update_products_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.item_type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Backfill the generated/stored vector for existing rows through the trigger.
UPDATE public.products SET updated_at = now();

GRANT SELECT ON public.product_item_types TO anon, authenticated;
