import { configureMistralProvider, mistralProvider } from './providers/mistral';
import type { AIConfiguration, AIInput, AIResult, AITask } from './types';

// Provider list is deliberately an array. Add future providers here without
// changing webhook handlers, session services, or marketplace business logic.
const PROVIDERS = [
  { provider: mistralProvider, tasks: ['buyer_search', 'seller_listing', 'conversation', 'image_analysis'] as AITask[] },
];

/** Configure runtime secrets through the router, never through a provider import. */
export function configureAI(configuration: AIConfiguration): void {
  configureMistralProvider(configuration);
}

export async function processAI(task: AITask, input: AIInput): Promise<AIResult> {
  const candidates = PROVIDERS.filter(candidate => candidate.tasks.includes(task));

  for (const { provider } of candidates) {
    try {
      return await provider.process(task, input);
    } catch (error) {
      // TODO: write ai_usage, mark ai_provider_status, and try the next provider
      // when a second provider is intentionally added.
      throw error;
    }
  }

  throw new Error(`No AI provider available for task: ${task}`);
}
