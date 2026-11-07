const DEFAULT_CANDIDATE_LIMIT = 20;
export const SEARCH_CONDITIONS = Object.freeze([
  'New',
  'Like-New',
  'Fair',
  'Needs Repair',
]);

/** Convert validated Stage 3 extraction into the only search shape Stage 4 accepts. */
export function buildSearchCriteria(extracted = {}) {
  return {
    category: normalizedString(extracted.category),
    budgetMax: normalizedNonNegativeNumber(extracted.budget_max),
    location: normalizedString(extracted.location),
    condition: normalizeSearchCondition(extracted.condition),
  };
}

/** Map customer language to the exact condition values used by products.condition. */
export function normalizeSearchCondition(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (normalized === 'new' || normalized === 'brand-new') return 'New';
  if (normalized === 'like-new') return 'Like-New';
  if (normalized === 'fair' || normalized === 'used' || normalized === 'second-hand' || normalized === 'pre-owned') return 'Fair';
  if (normalized === 'needs-repair') return 'Needs Repair';
  return null;
}

/** Fetch raw marketplace rows only. Ranking and reply construction live elsewhere. */
export async function searchProducts(supabase, criteria, options = {}) {
  const limit = positiveInteger(options.limit, DEFAULT_CANDIDATE_LIMIT);
  let query = supabase
    .from('products')
    .select('id,title,description,price,condition,category,location,city_name,created_at,seller:profiles!seller_id(id,full_name,phone,rating_avg,rating_count),product_images(image_url,image_order)')
    .eq('is_active', true)
    .eq('sold', false)
    .limit(limit);

  if (criteria.budgetMax !== null) query = query.lte('price', criteria.budgetMax);
  if (criteria.location) {
    const pattern = `%${escapeLike(criteria.location)}%`;
    // Older listings use location while newer product rows also expose city_name.
    // Keep them in one OR group so either representation can match the buyer's city.
    query = query.or(`location.ilike.${pattern},city_name.ilike.${pattern}`);
  }
  if (criteria.condition) query = query.eq('condition', criteria.condition);
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
    const storedImage = typeof firstImage?.image_url === 'string' ? firstImage.image_url.trim() : null;
    let imageUrl = storedImage && /^https:\/\//i.test(storedImage) ? storedImage : null;
    // A storage key has no URL scheme. Reject explicit non-HTTPS URLs instead
    // of accidentally converting a malformed external URL into a bucket path.
    const isExternalNonHttpsUrl = storedImage && /^[a-z][a-z0-9+.-]*:/i.test(storedImage);
    if (!imageUrl && storedImage && !isExternalNonHttpsUrl && supabase.storage?.from) {
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
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.toLowerCase() : null;
}

export function normalizedNonNegativeNumber(value) {
  // Number(null) and Number('') are zero, but neither represents a supplied
  // buyer budget. Preserve the distinction at the criteria boundary.
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const number = typeof value === 'string' ? Number(value.trim()) : value;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function escapeLike(value) {
  return value.replace(/[%,()]/g, '');
}
