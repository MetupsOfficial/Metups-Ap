export function parseSearchRequest(text) {
  const normalized = String(text || '').toLowerCase().trim();
  const budgetMatch = normalized.match(/\b(?:under|below|budget|up to|max|less than)\s*\$?(\d{1,9})\b/) || normalized.match(/\$?(\d{1,9})\b/);
  const locationMatch = normalized.match(/\b(?:in|near|around)\s+([a-z0-9\s]+)$/i) || normalized.match(/\b(?:in|near|around)\s+([a-z0-9\s]+)\b/i);
  const stopWords = new Set(['looking', 'for', 'need', 'want', 'find', 'under', 'below', 'budget', 'up', 'to', 'max', 'less', 'than', 'around', 'near', 'in', 'a', 'an', 'the', 'and', 'or', 'of', 'with']);

  const tokens = normalized
    .replace(/\$\d+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const keywordTokens = tokens.filter(token => !stopWords.has(token) && !/^\d+$/.test(token));
  const location = locationMatch ? locationMatch[1].trim().toLowerCase() : null;
  const keywords = keywordTokens.filter(token => token !== location?.replace(/\s+/g, ''))
    .join(' ')
    .trim();

  return {
    rawText: text,
    keywords: keywords || 'item',
    budget: budgetMatch ? Number(budgetMatch[1]) : null,
    location: location ? location.replace(/\s+/g, ' ').trim() : null,
  };
}

export function scoreMatch(item, criteria) {
  const title = String(item?.title || '').toLowerCase();
  const description = String(item?.description || '').toLowerCase();
  const location = String(item?.location || '').toLowerCase();
  const haystack = `${title} ${description} ${location}`;
  let score = 0;

  if (criteria.keywords) {
    const keywordTokens = criteria.keywords.toLowerCase().split(/\s+/).filter(Boolean);
    keywordTokens.forEach(token => {
      if (haystack.includes(token)) score += 8;
    });
  }

  if (criteria.budget != null && item?.price != null) {
    if (item.price <= criteria.budget) score += 5;
    if (Math.abs(item.price - criteria.budget) <= 100) score += 2;
  }

  if (criteria.location && location.includes(criteria.location)) {
    score += 3;
  }

  return score;
}

export function matchesCriteria(item, criteria) {
  const haystack = `${item?.title || ''} ${item?.description || ''} ${item?.location || ''}`.toLowerCase();
  const keywords = criteria.keywords?.toLowerCase().split(/\s+/).filter(Boolean) || [];

  if (criteria.keywords && criteria.keywords !== 'item' && !keywords.every(token => haystack.includes(token))) {
    return false;
  }

  if (criteria.budget != null && item?.price != null && item.price > criteria.budget) {
    return false;
  }

  if (criteria.location && !haystack.includes(criteria.location.toLowerCase())) {
    return false;
  }

  return true;
}
