import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';
import { CONVERSATION_INTENTS, isExplicitProductSearch, validateConversationResult } from '../conversation-validation.js';

export async function processConversation(input: AIInput): Promise<AIResult> {
  const explicitSearch = isExplicitProductSearch(input.message);

  const taskInstruction = [
    'Classify one Metups WhatsApp message. Return JSON only, never a customer reply.',
    `intent is exactly one of: ${CONVERSATION_INTENTS.join(', ')}.`,
    'search_product means the buyer wants to find, browse, or buy a product. sell_product means they want to advertise or sell one.',
    'extracted.category is a product type only; never use an intent, used, second-hand, or new as a category.',
    'Extract only facts in the message or compact supplied context. Unknown fields are null; never invent filters.',
    'For condition use exactly New, Like-New, Fair, or Needs Repair. Used, second-hand, and pre-owned mean Fair.',
    'A clear product search must be search_product, not greeting or help.',
    'Return exactly {"intent":"one allowed intent","confidence":0.0,"extracted":{"category":null,"budget_max":null,"location":null,"condition":null}}.',
    'budget_max is null or a non-negative number. confidence is a number from 0 through 1.',
  ].join('\n');

  const taskInput: AIInput = {
    ...input,
    context: {
      ...input.context,
      instruction: taskInstruction,
    },
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentInput =
      attempt === 0
        ? taskInput
        : {
            ...taskInput,
            context: {
              ...taskInput.context,
              instruction: [
                taskInstruction,
                '',
                'CORRECTION REQUIRED:',
                'Your previous classification failed validation.',
                explicitSearch
                  ? 'The message explicitly requests a product search. The intent MUST be search_product.'
                  : 'Re-read the message and correct the classification.',
                'Remember: extracted.category is the product type, never an intent label.',
                'Return the exact JSON structure only.',
              ].join('\n'),
            },
          };

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
