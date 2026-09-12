import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';

export function processSellerListing(input: AIInput): Promise<AIResult> {
  return processAI('seller_listing', {
    ...input,
    context: { ...input.context, instruction: 'Return JSON only. Extract listing details; do not publish, rank, or write a reply.' },
  });
}
