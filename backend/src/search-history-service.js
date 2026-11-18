// Product IDs are PostgreSQL UUIDs in the Metups products table. Keep only
// their safe textual representation before it reaches a PostgREST filter. Do
// not restrict the UUID version: PostgreSQL accepts valid UUIDs beyond v1–v5.
const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalise a session's product-ID history without retaining arbitrary data.
 * No history cap is applied: silently dropping older IDs would allow a listing
 * to reappear during the same active search session.
 */
export function normaliseProductIds(ids) {
  if (!Array.isArray(ids)) return [];

  const uniqueIds = new Set();
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const normalized = id.trim().toLowerCase();
    if (PRODUCT_ID_PATTERN.test(normalized)) uniqueIds.add(normalized);
  }
  return [...uniqueIds];
}

/**
 * Get every listing already shown for the active search. For sessions created
 * before seenProductIds existed, the latest resultIds are the initial history.
 */
export function getSeenProductIds(search) {
  if (!search || typeof search !== 'object') return [];
  return normaliseProductIds([
    ...(Array.isArray(search.seenProductIds) ? search.seenProductIds : []),
    ...(Array.isArray(search.resultIds) ? search.resultIds : []),
  ]);
}

/**
 * Build the compact search state stored in whatsapp_sessions.context.
 * resultIds is deliberately only the most recently displayed batch; seen IDs
 * retain the complete history for duplicate prevention.
 * @param {Record<string, any> | null} [previousSearch=null]
 */
export function buildSearchContext(criteria, displayedListings, previousSearch = null, options = {}) {
  const resultIds = normaliseProductIds(
    Array.isArray(displayedListings) ? displayedListings.map(listing => listing?.id) : [],
  );
  const previousSeenIds = options.resetHistory ? [] : getSeenProductIds(previousSearch);
  const context = {
    criteria,
    resultIds,
    seenProductIds: normaliseProductIds([...previousSeenIds, ...resultIds]),
  };
  const selectedProductId = options.resetHistory
    ? null
    : normaliseProductIds([previousSearch?.selectedProductId])[0] ?? null;

  // A buyer may page through listings after selecting one. Keep REPORT bound
  // to that selected product without expanding the current numeric result set.
  return selectedProductId ? { ...context, selectedProductId } : context;
}

/** A filter change starts a different result set and must reset history. */
export function hasSearchCriteriaChanged(previousCriteria, nextCriteria) {
  const fields = ['category', 'budgetMax', 'location', 'condition'];
  return fields.some(field => (previousCriteria?.[field] ?? null) !== (nextCriteria?.[field] ?? null));
}
