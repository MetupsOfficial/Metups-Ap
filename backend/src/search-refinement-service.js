const DEFAULT_CHEAPER_FACTOR = 0.8;

/** True only for the small set of follow-ups that safely modify a prior search. */
export function isSearchRefinementRequest(message) {
  return /\b(cheaper|less expensive|higher budget|more expensive|increase (?:the )?budget)\b/i.test(String(message ?? ''));
}

/**
 * Merge compact AI-extracted filters into the prior search. Pricing language is
 * handled deterministically so a follow-up like "show cheaper ones" does not
 * depend on a model inventing a new budget.
 */
export function refineSearchCriteria(previousCriteria, extracted = {}, message = '', options = {}) {
  if (!previousCriteria || typeof previousCriteria !== 'object') return null;
  const criteria = {
    category: nonEmptyString(extracted.category) ?? previousCriteria.category ?? null,
    budgetMax: nonNegativeNumber(extracted.budget_max) ?? previousCriteria.budgetMax ?? null,
    location: nonEmptyString(extracted.location) ?? previousCriteria.location ?? null,
    condition: nonEmptyString(extracted.condition) ?? previousCriteria.condition ?? null,
  };
  const text = String(message).toLowerCase();
  const currentBudget = Number(previousCriteria.budgetMax);
  if (!Number.isFinite(currentBudget) || currentBudget < 0 || nonNegativeNumber(extracted.budget_max) !== null) return criteria;

  const cheaperFactor = resolveCheaperFactor(options.cheaperFactor);
  if (/\b(cheaper|less expensive)\b/.test(text)) criteria.budgetMax = roundCurrency(currentBudget * cheaperFactor);
  if (/\b(higher budget|more expensive|increase (?:the )?budget)\b/.test(text)) {
    criteria.budgetMax = roundCurrency(currentBudget / cheaperFactor);
  }
  return criteria;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}

function nonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function resolveCheaperFactor(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1 ? parsed : DEFAULT_CHEAPER_FACTOR;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
