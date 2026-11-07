import { buildSearchCriteria } from './search-service.js';

const DEFAULT_CHEAPER_FACTOR = 0.8;

/** True only for the small set of follow-ups that safely modify a prior search. */
export function isSearchRefinementRequest(message) {
  const text = String(message ?? '').trim();
  return /\b(?:cheaper|less expensive|higher budget|more expensive|increase (?:the )?budget|more options|more results|show more)\b/i.test(text)
    || /^(?:(?:what about|how about)\s+)?(?:under|below|less than|up to|max(?:imum)?|budget(?:\s+of)?|for)\s*(?:usd|zwl|us\$|\$)?\s*\d/i.test(text)
    || /^(?:(?:what about|how about)\s+)?(?:in|around|near)\s+[a-z]/i.test(text)
    || /^(?:used|second[- ]hand|pre[- ]owned|brand[- ]new|like[- ]new|needs repair|fair|new)\b/i.test(text);
}

/**
 * Merge compact AI-extracted filters into the prior search. Pricing language is
 * handled deterministically so a follow-up like "show cheaper ones" does not
 * depend on a model inventing a new budget.
 */
export function refineSearchCriteria(previousCriteria, extracted = {}, message = '', options = {}) {
  if (!previousCriteria || typeof previousCriteria !== 'object') return null;
  const next = buildSearchCriteria(extracted);
  const criteria = {
    category: next.category ?? previousCriteria.category ?? null,
    budgetMax: next.budgetMax ?? previousCriteria.budgetMax ?? null,
    location: next.location ?? previousCriteria.location ?? null,
    condition: next.condition ?? previousCriteria.condition ?? null,
  };
  const text = String(message).toLowerCase();
  const currentBudget = Number(previousCriteria.budgetMax);
  if (previousCriteria.budgetMax === null || previousCriteria.budgetMax === undefined
    || !Number.isFinite(currentBudget) || currentBudget < 0 || next.budgetMax !== null) return criteria;

  const cheaperFactor = resolveCheaperFactor(options.cheaperFactor);
  if (/\b(cheaper|less expensive)\b/.test(text)) criteria.budgetMax = roundCurrency(currentBudget * cheaperFactor);
  if (/\b(higher budget|more expensive|increase (?:the )?budget)\b/.test(text)) {
    criteria.budgetMax = roundCurrency(currentBudget / cheaperFactor);
  }
  return criteria;
}

function resolveCheaperFactor(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1 ? parsed : DEFAULT_CHEAPER_FACTOR;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
