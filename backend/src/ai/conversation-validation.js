import { normalizeSearchCondition } from '../search-service.js';

export const CONVERSATION_INTENTS = Object.freeze([
  'greeting', 'help', 'search_product', 'sell_product', 'continue_conversation',
  'contact_seller', 'mark_sold', 'cancel', 'unknown',
]);

const SEARCH_REQUEST_PATTERN =
  /\b(?:find\s+me|find\s+(?:a|an|some|any)|search\s+for|looking\s+to\s+buy|want\s+to\s+buy|need\s+to\s+buy|looking\s+for\s+(?:a|an|some|any|used|second[- ]hand|new|cheap)|show\s+me\s+(?:a|an|some|any|used|second[- ]hand|new|cheap))\b/i;

export function isExplicitProductSearch(message) {
  return typeof message === 'string' && SEARCH_REQUEST_PATTERN.test(message);
}

/** Validate and canonicalize untrusted provider output before routing it. */
export function validateConversationResult(result, message) {
  if (!result || typeof result !== 'object' || !CONVERSATION_INTENTS.includes(result.intent)) return null;
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) return null;

  const extracted = result.extracted;
  if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)) return null;
  const fields = ['category', 'budget_max', 'location', 'condition'];
  if (!fields.every(field => Object.hasOwn(extracted, field))) return null;
  if (!nullableString(extracted.category) || !nullableString(extracted.location) || !nullableString(extracted.condition)) return null;
  if (extracted.budget_max !== null && (typeof extracted.budget_max !== 'number' || !Number.isFinite(extracted.budget_max) || extracted.budget_max < 0)) return null;
  if (typeof extracted.category === 'string' && CONVERSATION_INTENTS.includes(extracted.category.toLowerCase())) return null;
  if (isExplicitProductSearch(message) && result.intent !== 'search_product') return null;

  const condition = extracted.condition === null ? null : normalizeSearchCondition(extracted.condition);
  if (extracted.condition !== null && !condition) return null;
  return { ...result, extracted: { ...extracted, condition } };
}

function nullableString(value) {
  return value === null || typeof value === 'string';
}
