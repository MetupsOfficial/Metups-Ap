import {
  configureGeminiProvider,
  geminiProvider,
} from './providers/gemini';

import {
  configureLocalLlamaProvider,
  localLlamaProvider,
} from './providers/localLlama';

import type {
  AIConfiguration,
  AIInput,
  AIProvider,
  AIResult,
  AITask,
} from './types';

interface ProviderRegistration {
  provider: AIProvider;
  tasks: AITask[];
}

const GEMINI_TASKS: AITask[] = [
  'buyer_search',
  'seller_listing',
  'conversation',
  'image_analysis',
];

const LOCAL_LLM_TASKS: AITask[] = [
  'buyer_search',
  'conversation',
];

let configuredProviders: ProviderRegistration[] = [];

/**
 * Configure providers through the router.
 *
 * When local Qwen is configured, it takes priority for conversation
 * interpretation and buyer-search extraction.
 *
 * Gemini remains available as a fallback and continues to handle
 * tasks not assigned to the local model.
 */
export function configureAI(configuration: AIConfiguration): void {
  configureGeminiProvider(configuration);
  configureLocalLlamaProvider(configuration);

  const providers: ProviderRegistration[] = [];

  const localConfigured = Boolean(
    configuration.localBaseUrl?.trim() &&
    configuration.localApiKey?.trim() &&
    configuration.localModel?.trim(),
  );

  const geminiConfigured = Boolean(
    configuration.apiKey?.trim() &&
    configuration.model?.trim(),
  );

  if (localConfigured) {
    providers.push({
      provider: localLlamaProvider,
      tasks: LOCAL_LLM_TASKS,
    });
  }

  if (geminiConfigured) {
    providers.push({
      provider: geminiProvider,
      tasks: GEMINI_TASKS,
    });
  }

  configuredProviders = providers;
}

export async function processAI(
  task: AITask,
  input: AIInput,
): Promise<AIResult> {
  const candidates = configuredProviders.filter(candidate =>
    candidate.tasks.includes(task),
  );

  if (candidates.length === 0) {
    throw new Error(`No AI provider configured for task: ${task}`);
  }

  let lastError: unknown;

  for (const { provider } of candidates) {
    try {
      return await provider.process(task, input);
    } catch (error) {
      lastError = error;

      // Continue to the next configured provider.
      // This enables Gemini fallback if the local model fails.
      console.warn(
        JSON.stringify({
          event: 'ai.provider_failed',
          task,
          provider: provider.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  throw new Error(
    `All configured AI providers failed for task "${task}": ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`,
  );
}