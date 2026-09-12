import { processAI } from '../router';
import type { AIInput, AIResult } from '../types';

export function processImageAnalysis(input: AIInput): Promise<AIResult> {
  return processAI('image_analysis', {
    ...input,
    context: { ...input.context, instruction: 'Return JSON only. Analyze only the supplied image URLs and context.' },
  });
}
