import type { AIResult } from './ai/types';
import { normalizeSearchCondition } from './search-service.js';

const EMPTY_EXTRACTED = {
  category: null,
  budget_max: null,
  location: null,
  condition: null,
};

/**
 * Resolve clear WhatsApp messages locally.
 * This keeps common marketplace searches independent of an external
 * model's queue or inference latency.
 *
 * Return null for genuinely ambiguous messages so the AI provider
 * can handle them.
 */
export function classifyFastIntent(rawMessage: string): AIResult | null {
  const message = String(rawMessage ?? '').trim();
  const text = message.toLowerCase();

  if (!text) return null;

  // Greetings
  if (
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))(?:\s+(?:there|metups))?[!.\s]*$/i.test(
      message,
    )
  ) {
    return result('greeting');
  }

  // Help requests
  if (
    /^(?:help|menu|what can you do|how (?:does|do) (?:this|it) work)[?!.\s]*$/i.test(
      message,
    )
  ) {
    return result('help');
  }

  // Cancellation requests
  if (
    /^(?:cancel|stop|reset|start over|clear)(?:\s+(?:search|it|this))?[!.\s]*$/i.test(
      message,
    )
  ) {
    return result('cancel');
  }

  // Seller requests
  if (isSellerRequest(text)) {
    return result('sell_product');
  }

  // Buyer searches
  const extracted = extractSearchFields(message);

  if (isClearlySearching(text, extracted)) {
    return result('search_product', extracted);
  }

  return null;
}

/**
 * Recognise common natural-language seller requests.
 */
function isSellerRequest(text: string): boolean {
  // Examples:
  // "I want to sell my old sofa"
  // "I would like to sell a phone"
  // "Sell my laptop"
  // "I want to list my furniture"
  if (
    /\b(?:(?:i\s+)?(?:want|would like|need)\s+to\s+)?(?:sell|selling|list|advertise)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  // Examples:
  // "I have a sofa to sell"
  // "I've got a phone to sell"
  if (/\b(?:have|got)\b[\s\S]*\bto\s+sell\b/i.test(text)) {
    return true;
  }

  // Examples:
  // "Upload a product photo"
  // "Post an item"
  // "Add a listing"
  return /\b(?:upload|post|add)\b[\s\S]*\b(?:product|item|listing|photo|image)\b/i.test(
    text,
  );
}

function result(
  intent: string,
  extracted = EMPTY_EXTRACTED,
): AIResult {
  return {
    intent,
    confidence: 1,
    extracted,
    provider: 'rules',
  };
}

/**
 * Determine whether a message is clearly a product search.
 */
function isClearlySearching(
  text: string,
  extracted: typeof EMPTY_EXTRACTED,
): boolean {
  if (
    /\b(?:find|search|looking\s+for|look\s+for|need|want|show\s+me|buy|available|do\s+you\s+have|can\s+you\s+show\s+me|interested\s+in\s+buying)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  if (
    extracted.budget_max !== null ||
    extracted.location !== null ||
    extracted.condition !== null
  ) {
    return true;
  }

  return /\b(?:phone|iphone|samsung|laptop|computer|tablet|tv|television|sofa|couch|bed|chair|table|fridge|refrigerator|stove|washing machine|car|vehicle|book|shoes|dress|clothes)\b/i.test(
    text,
  );
}

/**
 * Extract product search filters from a message.
 */
function extractSearchFields(message: string): typeof EMPTY_EXTRACTED {
  let remaining = message.toLowerCase();

  let budgetMax: number | null = null;
  let location: string | null = null;
  let condition: string | null = null;

  // 1. Extract budget.
  // Supports:
  // "under $100"
  // "under USD 100"
  // "below 100"
  // "budget of 150"
  // "for $80"
  const budgetMatch = remaining.match(
    /(?:under|below|less than|up to|max(?:imum)?|budget(?:\s+of)?|for)\s*(?:usd|zwl|us\$|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ) ??
    remaining.match(
      /(?:usd|zwl|us\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/i,
    );

  if (budgetMatch) {
    const parsed = Number(budgetMatch[1].replace(/,/g, ''));

    if (Number.isFinite(parsed) && parsed >= 0) {
      budgetMax = parsed;
    }

    remaining = remaining.replace(budgetMatch[0], ' ');
  }

  // 2. Extract condition before location so location parsing
  // cannot accidentally absorb condition words.
  const conditionMatch = remaining.match(
    /\b(brand[- ]new|second[- ]hand|like[- ]new|needs repair|fair|used|new)\b/i,
  );

  if (conditionMatch) {
    condition = normalizeSearchCondition(conditionMatch[1]);

    remaining = remaining.replace(conditionMatch[0], ' ');
  }

  // 3. Extract location.
  // Stop when another filter or product-description phrase begins.
  const locationMatch = remaining.match(
    /\b(?:in|around|near)\s+(?!buying\b)([a-z][a-z\s-]{0,48}?)(?=\s+(?:under|below|less than|up to|for|with|without|brand[- ]new|second[- ]hand|like[- ]new|needs repair|used|new)\b|$|[,.;!?])/i,
  );

  if (locationMatch) {
    location = locationMatch[1].trim();

    remaining = remaining.replace(locationMatch[0], ' ');
  }

  // 4. Extract category from whatever remains.
  const category = remaining
    .replace(
      /\b(?:find|search|looking\s+for|look\s+for|i\s+(?:am|'m)\s+looking\s+for|need|want|show\s+me|buy|a|an|the|some|please|what\s+about|in|around|near)\b/gi,
      ' ',
    )
    .replace(/\b(?:i|me|am|to|do|you|have|can|interested|buying|for|cheap)\b/gi, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;

  return {
    category,
    budget_max: budgetMax,
    location,
    condition,
  };
}
