import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';

const INTENTS = ['greeting', 'help', 'search_product', 'sell_product', 'continue_conversation', 'contact_seller', 'mark_sold', 'cancel', 'unknown'];

export async function processConversation(input: AIInput): Promise<AIResult> {
  const taskInput: AIInput = {
    ...input,
    context: {
      ...input.context,
      instruction: [
        'Classify this Metups WhatsApp message. Return JSON only; never write a reply.',
        `intent must be one of: ${INTENTS.join(', ')}.`,
        'Use compact session context only for follow-up interpretation.',
        'Return exactly {"intent":string,"confidence":number,"extracted":{"category":string|null,"budget_max":number|null,"location":string|null,"condition":string|null}}.',
        'Confidence must be from 0 through 1. Use unknown when uncertain.',
      ].join(' '),
    },
  };

  // The second request carries the stricter same task prompt after malformed data.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await processAI('conversation', attempt === 0 ? taskInput : {
      ...taskInput,
      context: { ...taskInput.context, instruction: `${taskInput.context?.instruction} Previous output was invalid; return the exact JSON schema only.` },
    });
    const valid = validateConversationResult(result);
    if (valid) return valid;
  }
  return unknownConversationResult();
}

export function unknownConversationResult(): AIResult {
  return {
    intent: 'unknown',
    confidence: 0,
    extracted: { category: null, budget_max: null, location: null, condition: null },
    provider: 'none',
  };
}

function validateConversationResult(result: AIResult): AIResult | null {
  if (!INTENTS.includes(result.intent) || result.confidence < 0 || result.confidence > 1) return null;
  const extracted = result.extracted;
  const fields = ['category', 'budget_max', 'location', 'condition'];
  if (!fields.every(field => Object.hasOwn(extracted, field))) return null;
  if (!nullableString(extracted.category) || !nullableString(extracted.location) || !nullableString(extracted.condition)) return null;
  if (extracted.budget_max !== null && (!Number.isFinite(extracted.budget_max) || Number(extracted.budget_max) < 0)) return null;
  return result;
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}
