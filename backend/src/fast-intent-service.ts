import type { AIResult } from './ai/types';

const EMPTY_EXTRACTED = {
  category: null,
  budget_max: null,
  location: null,
  condition: null,
};

/**
 * Resolve clear WhatsApp messages locally. This keeps common marketplace
 * searches independent of an external model's queue or inference latency.
 * Return null for genuinely ambiguous messages so Gemini remains available.
 */
export function classifyFastIntent(rawMessage: string): AIResult | null {
  const message = String(rawMessage ?? '').trim();
  const text = message.toLowerCase();
  if (!text) return null;

  if (/^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))(?:\s+(?:there|metups))?[!.\s]*$/i.test(message)) {
    return result('greeting');
  }
  if (/^(?:help|menu|what can you do|how (?:does|do) (?:this|it) work)[?!.\s]*$/i.test(message)) return result('help');
  if (/^(?:cancel|stop|reset|start over|clear)(?:\s+(?:search|it|this))?[!.\s]*$/i.test(message)) return result('cancel');
  if (/\b(?:sell|list|upload|post|add)\b[\s\S]*\b(?:product|item|listing|photo|image)\b/i.test(message)) return result('sell_product');

  const extracted = extractSearchFields(message);
  if (isClearlySearching(text, extracted)) return result('search_product', extracted);
  return null;
}

function result(intent: string, extracted = EMPTY_EXTRACTED): AIResult {
  return { intent, confidence: 1, extracted, provider: 'rules' };
}

function isClearlySearching(text: string, extracted: typeof EMPTY_EXTRACTED): boolean {
  if (/\b(?:find|search|looking\s+for|look\s+for|need|want|show\s+me|buy|available)\b/i.test(text)) return true;
  if (extracted.budget_max !== null || extracted.location !== null || extracted.condition !== null) return true;
  return /\b(?:phone|iphone|samsung|laptop|computer|tablet|tv|television|sofa|couch|bed|chair|table|fridge|refrigerator|stove|washing machine|car|vehicle|book|shoes|dress|clothes)\b/i.test(text);
}

function extractSearchFields(message: string): typeof EMPTY_EXTRACTED {
  let remaining = message.toLowerCase();
  let budgetMax: number | null = null;
  let location: string | null = null;
  let condition: string | null = null;

  const budgetMatch = remaining.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?:\s+of)?|for)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i)
    ?? remaining.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  if (budgetMatch) {
    const parsed = Number(budgetMatch[1].replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0) budgetMax = parsed;
    remaining = remaining.replace(budgetMatch[0], ' ');
  }

  const locationMatch = remaining.match(/\b(?:in|around|near)\s+([a-z][a-z\s-]{1,48}?)(?=$|[,.;!?])/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
    remaining = remaining.replace(locationMatch[0], ' ');
  }

  const conditionMatch = remaining.match(/\b(brand new|like[-\s]?new|needs repair|fair|used|new)\b/i);
  if (conditionMatch) {
    condition = normalizeCondition(conditionMatch[1]);
    remaining = remaining.replace(conditionMatch[0], ' ');
  }

  const category = remaining
    .replace(/\b(?:find|search|looking\s+for|look\s+for|i\s+(?:am|'m)\s+looking\s+for|need|want|show\s+me|buy|a|an|the|some|please)\b/gi, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;

  return { category, budget_max: budgetMax, location, condition };
}

function normalizeCondition(value: string): string {
  const normalized = value.toLowerCase().replace(/\s+/g, '-');
  if (normalized === 'like-new') return 'Like-New';
  if (normalized === 'brand-new' || normalized === 'new') return 'New';
  if (normalized === 'needs-repair') return 'Needs Repair';
  if (normalized === 'used') return 'Fair';
  return 'Fair';
}
