const DEFAULT_CANDIDATE_LIMIT = 20;

/** Convert validated Stage 3 extraction into the only search shape Stage 4 accepts. */
export function buildSearchCriteria(extracted = {}) {
  return {
    category: normalizedString(extracted.category),
    budgetMax: normalizedNonNegativeNumber(extracted.budget_max),
    location: normalizedString(extracted.location),
    condition: normalizedString(extracted.condition),
  };
}

/** Fetch raw marketplace rows only. Ranking and reply construction live elsewhere. */
export async function searchProducts(supabase, criteria, options = {}) {
  const limit = positiveInteger(options.limit, DEFAULT_CANDIDATE_LIMIT);
  let query = supabase
    .from('products')
    .select('id,title,description,price,condition,category,location,city_name,created_at,seller:profiles!seller_id(id,full_name,phone,rating_avg,rating_count,phone_verified),product_images(image_url,image_order)')
    .eq('is_active', true)
    .eq('sold', false)
    .limit(limit);

  if (criteria.budgetMax !== null) query = query.lte('price', criteria.budgetMax);
  if (criteria.location) query = query.ilike('location', `%${escapeLike(criteria.location)}%`);
  if (criteria.condition) query = query.ilike('condition', `%${escapeLike(criteria.condition)}%`);
  query = query.order('image_order', { referencedTable: 'product_images', ascending: true });

  // A user phrase such as "laptop" may be stored in title, description, or category.
  if (criteria.category) {
    const pattern = `%${escapeLike(criteria.category)}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Product search failed: ${error.message}`);
  return Array.isArray(data) ? data.map(product => {
    const seller = Array.isArray(product.seller) ? product.seller[0] : product.seller;
    const images = Array.isArray(product.product_images) ? product.product_images : [];
    const firstImage = images.find(image => image?.image_url);
    const storedImage = firstImage?.image_url;
    let imageUrl = typeof storedImage === 'string' && /^https:\/\//i.test(storedImage) ? storedImage : null;
    if (!imageUrl && storedImage && supabase.storage?.from) {
      const publicUrl = supabase.storage.from('product_images').getPublicUrl(storedImage).data?.publicUrl;
      imageUrl = typeof publicUrl === 'string' && /^https:\/\//i.test(publicUrl) ? publicUrl : null;
    }
    return {
      ...product,
      seller_phone: seller?.phone ?? null,
      image_url: imageUrl,
    };
  }) : [];
}

function normalizedString(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

function normalizedNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function escapeLike(value) {
  return value.replace(/[%,()]/g, '');
}
