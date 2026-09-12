import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';

export function processBuyerSearch(input: AIInput): Promise<AIResult> {
  return processAI('buyer_search', {
    ...input,
    context: { ...input.context, instruction: 'Return JSON only. Extract search criteria; do not rank products or write a reply.' },
  });
}
