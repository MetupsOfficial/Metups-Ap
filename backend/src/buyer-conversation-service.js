import { buildSearchCriteria } from './search-service.js';

const PENDING_QUESTIONS = new Set(['category', 'location']);

/** Keep pre-search clarification state compact and safe for session JSONB. */
export function getSearchDraft(context = {}) {
  const draft = context?.searchDraft;
  if (!draft || typeof draft !== 'object' || !PENDING_QUESTIONS.has(draft.pendingQuestion)) return null;
  return {
    criteria: toCriteria(draft.criteria),
    pendingQuestion: draft.pendingQuestion,
  };
}

export function buildSearchDraft(criteria, pendingQuestion) {
  if (!PENDING_QUESTIONS.has(pendingQuestion)) throw new Error('Unsupported buyer search question');
  return { criteria: toCriteria(criteria), pendingQuestion };
}

export function clearSearchDraft(context = {}) {
  const { searchDraft: _searchDraft, ...remaining } = context ?? {};
  return remaining;
}

/** Ask only for information that is required to make a useful marketplace search. */
export function nextSearchClarification(criteria) {
  const normalized = toCriteria(criteria);
  if (!normalized.category) return { pendingQuestion: 'category' };
  if (!normalized.location) return { pendingQuestion: 'location' };
  return null;
}

/**
 * Resolve a short answer to a pending search question without an AI call.
 * A budget supplied alongside a town is retained, but budget is optional and
 * never blocks browsing once we know the item and town.
 */
export function resolveSearchDraftAnswer(draft, message) {
  if (!draft?.criteria || !PENDING_QUESTIONS.has(draft.pendingQuestion)) return null;
  const text = String(message ?? '').trim();
  if (!text || /^(?:cancel|stop|reset|start over|clear|help|menu)$/i.test(text)) return null;

  const current = toCriteria(draft.criteria);
  const budgetMax = extractBudget(text) ?? current.budgetMax;
  let category = current.category;
  let location = current.location;

  if (draft.pendingQuestion === 'category') category = extractCategory(text);
  if (draft.pendingQuestion === 'location') location = extractLocation(text);
  if (!category && draft.pendingQuestion !== 'category') category = extractCategory(text);

  const criteria = toCriteria({ ...current, category, location, budgetMax });
  if (criteria.category === current.category
    && criteria.location === current.location
    && criteria.budgetMax === current.budgetMax) return null;

  return { criteria, clarification: nextSearchClarification(criteria) };
}

function toCriteria(value = {}) {
  return buildSearchCriteria({
    category: value?.category ?? null,
    budget_max: value?.budgetMax ?? value?.budget_max ?? null,
    location: value?.location ?? null,
    condition: value?.condition ?? null,
  });
}

function extractBudget(text) {
  const match = text.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?:\s+of)?|for)?\s*(?:usd|zwl|us\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/i)
    ?? text.match(/^(?:under|below|less than|up to|max(?:imum)?|budget(?:\s+of)?)\s*([\d,]+(?:\.\d{1,2})?)$/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function extractLocation(text) {
  const withoutBudget = text
    .replace(/(?:under|below|less than|up to|max(?:imum)?|budget(?:\s+of)?|for)?\s*(?:usd|zwl|us\$|\$)\s*[\d,]+(?:\.\d{1,2})?/ig, ' ')
    .replace(/\b(?:in|around|near)\b/ig, ' ')
    .replace(/[^a-z\s-]/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!withoutBudget || withoutBudget.length > 50) return null;
  if (/\b(?:cancel|help|show|more|anything|else|cheaper|budget)\b/i.test(withoutBudget)) return null;
  return withoutBudget.toLowerCase();
}

function extractCategory(text) {
  const category = text
    .replace(/\b(?:i|am|i'm|looking|for|need|want|a|an|some|please|search|find|show|me|to|buy)\b/ig, ' ')
    .replace(/[^a-z0-9\s-]/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!category || category.length > 80) return null;
  if (/^(?:cancel|help|menu|more|anything else)$/i.test(category)) return null;
  return category;
}
