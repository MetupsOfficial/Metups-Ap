const TOP_RESULT_LIMIT = 3;

/** Scores rows already fetched by search-service. It never calls Supabase. */
export function rankProducts(products, criteria, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : TOP_RESULT_LIMIT;
  return products
    .map(product => ({ ...product, score: scoreProduct(product, criteria, now) }))
    .sort((left, right) => right.score - left.score || newestFirst(left, right))
    .slice(0, limit);
}

export function scoreProduct(product, criteria, now = new Date()) {
  let score = 0;
  const title = normalized(product.title);
  const description = normalized(product.description);
  const category = normalized(product.category);
  const location = normalized(product.location || product.city_name);

  if (criteria.category) {
    if (title === criteria.category || category === criteria.category) score += 50;
    else if (title.includes(criteria.category) || category.includes(criteria.category)) score += 35;
    else if (description.includes(criteria.category)) score += 15;
  }
  if (criteria.location && location.includes(criteria.location)) score += 15;
  if (criteria.condition && normalized(product.condition) === criteria.condition) score += 8;
  if (criteria.budgetMax !== null) {
    const price = Number(product.price);
    if (Number.isFinite(price) && price <= criteria.budgetMax) {
      score += 10 + Math.max(0, 10 * (1 - ((criteria.budgetMax - price) / Math.max(criteria.budgetMax, 1))));
    }
  }

  score += freshnessScore(product.created_at, now);
  score += reputationScore(product.seller);
  return Math.round(score * 100) / 100;
}

function freshnessScore(createdAt, now) {
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return 0;
  const ageDays = Math.max(0, (now.getTime() - time) / 86_400_000);
  return Math.max(0, 8 - Math.min(8, ageDays / 7));
}

function reputationScore(seller) {
  const profile = Array.isArray(seller) ? seller[0] : seller;
  const average = Number(profile?.rating_avg);
  const count = Number(profile?.rating_count);
  if (!Number.isFinite(average) || average <= 0) return 0;
  return Math.min(5, average) + Math.min(2, Math.log10(Math.max(1, count)));
}

function newestFirst(left, right) {
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

function normalized(value) {
  return String(value ?? '').trim().toLowerCase();
}
