import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';

const INTENTS = [
  'greeting',
  'help',
  'search_product',
  'sell_product',
  'continue_conversation',
  'contact_seller',
  'mark_sold',
  'cancel',
  'unknown',
];

const SEARCH_REQUEST_PATTERN =
  /\b(?:find\s+me|find\s+(?:a|an|some|any)|search\s+for|looking\s+to\s+buy|want\s+to\s+buy|need\s+to\s+buy|looking\s+for\s+(?:a|an|some|any|used|second[- ]hand|new|cheap)|show\s+me\s+(?:a|an|some|any|used|second[- ]hand|new|cheap))\b/i;

export async function processConversation(input: AIInput): Promise<AIResult> {
  const explicitSearch = isExplicitProductSearch(input.message);

  const taskInstruction = [
    'You classify incoming customer messages for Metups, a second-hand marketplace operating in Zimbabwe.',
    'Return JSON only. Never write a customer-facing reply.',
    '',
    `Choose exactly one intent from: ${INTENTS.join(', ')}.`,
    '',
    'INTENT DEFINITIONS:',
    '- greeting: The customer is simply greeting Metups, such as Hello or Good morning.',
    '- help: The customer is asking how Metups works or requesting assistance.',
    '- search_product: The customer wants to find, view, browse, or buy a product.',
    '- sell_product: The customer wants to advertise or sell an item.',
    '- continue_conversation: The customer is continuing an existing conversation without starting a new task.',
    '- contact_seller: The customer wants to contact a seller.',
    '- mark_sold: The customer wants to mark their listing as sold.',
    '- cancel: The customer wants to cancel an active process.',
    '- unknown: The message is unclear or does not fit another intent.',
    '',
    'IMPORTANT DISTINCTION:',
    '- intent describes WHAT THE CUSTOMER WANTS TO DO.',
    '- extracted.category describes WHICH PRODUCT THEY WANT.',
    '- A product category must be a product type, such as fridge, sofa, phone, or television.',
    '- Never put intent names such as greeting, help, or search_product inside extracted.category.',
    '- Words such as second-hand, used, and new describe condition, not product category.',
    '',
    'SEARCH CLASSIFICATION:',
    '- A request to find, search for, show, browse, or buy a product is search_product.',
    '- Do not classify a product search request as greeting or help.',
    '- Extract only information supported by the message or relevant conversation context.',
    '- Use null when a field is not known.',
    '- Use conversation context to understand follow-up messages, but do not let old context override a clear new request.',
    '',
    'EXAMPLES:',
    'Message: "Find me a second-hand fridge in Harare for less than USD 100."',
    'Output: {"intent":"search_product","confidence":0.98,"extracted":{"category":"fridge","budget_max":100,"location":"Harare","condition":"second-hand"}}',
    '',
    'Message: "Hello there!"',
    'Output: {"intent":"greeting","confidence":0.98,"extracted":{"category":null,"budget_max":null,"location":null,"condition":null}}',
    '',
    'Message: "I want to buy a sofa."',
    'Output: {"intent":"search_product","confidence":0.98,"extracted":{"category":"sofa","budget_max":null,"location":null,"condition":null}}',
    '',
    'Return exactly this structure:',
    '{"intent":"one allowed intent","confidence":0.0,"extracted":{"category":null,"budget_max":null,"location":null,"condition":null}}',
    'Confidence must be a number from 0 through 1. Be conservative when uncertain.',
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

function validateConversationResult(
  result: AIResult,
  message?: string,
): AIResult | null {
  if (!INTENTS.includes(result.intent)) return null;

  if (
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    return null;
  }

  const extracted = result.extracted;

  const fields = ['category', 'budget_max', 'location', 'condition'];

  if (!fields.every((field) => Object.hasOwn(extracted, field))) {
    return null;
  }

  if (
    !nullableString(extracted.category) ||
    !nullableString(extracted.location) ||
    !nullableString(extracted.condition)
  ) {
    return null;
  }

  if (
    extracted.budget_max !== null &&
    (typeof extracted.budget_max !== 'number' ||
      !Number.isFinite(extracted.budget_max) ||
      extracted.budget_max < 0)
  ) {
    return null;
  }

  // An intent label can never be a product category.
  if (
    typeof extracted.category === 'string' &&
    INTENTS.includes(extracted.category)
  ) {
    return null;
  }

  // Do not accept a greeting classification for an explicit product search.
  if (
    isExplicitProductSearch(message) &&
    result.intent !== 'search_product'
  ) {
    return null;
  }

  return result;
}

function isExplicitProductSearch(message?: string): boolean {
  return typeof message === 'string' &&
    SEARCH_REQUEST_PATTERN.test(message);
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}