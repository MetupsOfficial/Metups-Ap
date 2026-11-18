import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';
import { CONVERSATION_INTENTS, isExplicitProductSearch, validateConversationResult } from '../conversation-validation.js';

/**
 * Builds the conversation classification input.
 * Exported so independent AI providers can reuse the exact same instructions.
 */
export function buildConversationTaskInput(
  input: AIInput,
  attempt = 0,
): AIInput {
  const explicitSearch = isExplicitProductSearch(input.message);

  const taskInstruction = [
    'Classify one Metups WhatsApp message. Return JSON only, never a customer reply.',
    `intent is exactly one of: ${CONVERSATION_INTENTS.join(', ')}.`,
    'search_product means the buyer wants to find, browse, or buy a product. sell_product means they want to advertise or sell one.',
    'extracted.category is the exact item type the buyer wants (for example smartphone, laptop, television, sofa, washing machine, or car), never a broad department such as Electronics and never an intent, used, second-hand, or new.',
    'Extract only facts in the message or compact supplied context. Unknown fields are null; never invent filters.',
    'If compact context says currentStage is awaiting_category or awaiting_location, treat a short relevant answer as search_product and extract the missing product type or town.',
    'For condition use exactly New, Like-New, Fair, or Needs Repair. New and brand-new indicate New; like-new indicates Like-New; fair indicates Fair; needs repair indicates Needs Repair. Used, second-hand, and pre-owned describe product status, not physical condition, so leave condition null unless physical condition is explicitly stated.',
    'A clear product search must be search_product, not greeting or help.',
    'Return exactly {"intent":"one allowed intent","confidence":0.0,"extracted":{"category":null,"budget_max":null,"location":null,"condition":null}}.',
    'budget_max is null or a non-negative number. confidence is a number from 0 through 1.',
  ].join('\n');

  const instruction =
    attempt === 0
      ? taskInstruction
      : [
          taskInstruction,
          '',
          'CORRECTION REQUIRED:',
          'Your previous classification failed validation.',
          explicitSearch
            ? 'The message explicitly requests a product search. The intent MUST be search_product.'
            : 'Re-read the message and correct the classification.',
          'Remember: extracted.category is the exact product type, never a broad department or intent label.',
          'Return the exact JSON structure only.',
        ].join('\n');

  return {
    ...input,
    context: {
      ...input.context,
      instruction,
    },
  };
}

export async function processConversation(input: AIInput): Promise<AIResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentInput = buildConversationTaskInput(input, attempt);

    const result = await processAI('conversation', currentInput);
    const valid = validateConversationResult(result, input.message);

    if (valid) {
      return valid;
    }
  }

  return unknownConversationResult();
}

export function unknownConversationResult(): AIResult {
  return {
    intent: 'unknown',
    confidence: 0,
    extracted: {
      category: null,
      budget_max: null,
      location: null,
      condition: null,
    },
    provider: 'none',
  };
}
