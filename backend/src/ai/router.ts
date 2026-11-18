import { configureGeminiProvider, geminiProvider } from './providers/gemini';
import { configureLocalLlamaProvider, localLlamaProvider } from './providers/localLlama';
import { createOpenAICompatibleProvider } from './providers/openAICompatible';
import { createWorkersAIProvider, isWorkersAIModel } from './providers/workersAI';
import { classifyProviderFailure, type AIProviderFailureKind } from './provider-failure';
import type {
  AIConfiguration,
  AIInput,
  AIProvider,
  AIResult,
  AITask,
  OpenAICompatibleModelConfiguration,
} from './types';

interface ProviderRegistration {
  provider: AIProvider;
  tasks: AITask[];
}

export { classifyProviderFailure, type AIProviderFailureKind } from './provider-failure';

interface CircuitState {
  consecutiveTransientFailures: number;
  openUntil: number;
}

const CONVERSATION_TASKS: AITask[] = ['buyer_search', 'conversation'];
const GEMINI_TASKS: AITask[] = [
  'buyer_search',
  'seller_listing',
  'conversation',
  'image_analysis',
];
const CIRCUIT_FAILURE_THRESHOLD = 2;
const CIRCUIT_COOLDOWN_MS = 30_000;
const TRANSIENT_RETRY_DELAY_MS = 200;
const DEFAULT_TOTAL_TIMEOUT_MS = 12_000;

let configuredProviders: ProviderRegistration[] = [];
const circuitStates = new Map<string, CircuitState>();
let totalTimeoutMs = DEFAULT_TOTAL_TIMEOUT_MS;

/**
 * Configures the ordered provider pool. Incomplete providers are omitted, so
 * no request is sent until the corresponding environment values are added.
 */
export function configureAI(configuration: AIConfiguration): void {
  configureGeminiProvider(configuration);
  configureLocalLlamaProvider(configuration);
  totalTimeoutMs = resolveTimeout(configuration.totalTimeoutMs, DEFAULT_TOTAL_TIMEOUT_MS);

  const providers: ProviderRegistration[] = [];

  if (isLocalConfigured(configuration)) {
    providers.push({ provider: localLlamaProvider, tasks: CONVERSATION_TASKS });
  }

  addWorkersAIProvider(providers, 'cloudflare_workers_ai_glm', configuration.workersAI,
    configuration.workersAIGlmModel, configuration.workersAITimeoutMs);
  addWorkersAIProvider(providers, 'cloudflare_workers_ai_gemma', configuration.workersAI,
    configuration.workersAIGemmaModel, configuration.workersAITimeoutMs);

  addCompatibleProvider(providers, configuration.groqFast);
  addCompatibleProvider(providers, configuration.groqReasoning);

  if (isGeminiConfigured(configuration)) {
    providers.push({ provider: geminiProvider, tasks: GEMINI_TASKS });
  }

  addCompatibleProvider(providers, configuration.mistralFast);
  addCompatibleProvider(providers, configuration.mistralStrong);
  addCompatibleProvider(providers, configuration.openAIFast);
  addCompatibleProvider(providers, configuration.openAINano);
  addCompatibleProvider(providers, configuration.cerebrasFast);

  configuredProviders = providers;
}

/**
 * Uses sequential failover: one short retry for 429/503, then the next
 * healthy provider. It never fans a buyer message out to several providers.
 */
export async function processAI(task: AITask, input: AIInput): Promise<AIResult> {
  const candidates = configuredProviders.filter(candidate => candidate.tasks.includes(task));
  if (candidates.length === 0) throw new Error(`No AI provider configured for task: ${task}`);

  const startedAt = Date.now();
  let lastError: unknown;

  for (const { provider } of candidates) {
    if (isCircuitOpen(provider.name)) {
      console.warn(JSON.stringify({ event: 'ai.provider_skipped', task, provider: provider.name, reason: 'circuit_open' }));
      continue;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await provider.process(task, input);
        markProviderSuccess(provider.name);
        return result;
      } catch (error) {
        lastError = error;
        const kind = classifyProviderFailure(error);
        const retry = attempt === 0 && isRetryable(kind) && hasRetryTimeRemaining(startedAt);
        markProviderFailure(provider.name, kind);

        console.warn(JSON.stringify({
          event: 'ai.provider_failed', task, provider: provider.name,
          attempt: attempt + 1, failureKind: kind, retry,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));

        if (!retry) break;
        await delay(TRANSIENT_RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `All configured AI providers failed for task "${task}": ${
      lastError instanceof Error ? lastError.message : 'Unknown error'
    }`,
  );
}

function addCompatibleProvider(
  providers: ProviderRegistration[],
  configuration: OpenAICompatibleModelConfiguration | undefined,
): void {
  if (!configuration?.baseUrl?.trim() || !configuration.apiKey?.trim() || !configuration.model?.trim()) return;
  providers.push({ provider: createOpenAICompatibleProvider(configuration), tasks: CONVERSATION_TASKS });
}

function addWorkersAIProvider(
  providers: ProviderRegistration[],
  name: string,
  ai: Ai | undefined,
  model: string | undefined,
  timeoutMs: string | number | undefined,
): void {
  if (!ai || !isWorkersAIModel(model)) return;
  providers.push({ provider: createWorkersAIProvider(name, ai, model, timeoutMs), tasks: CONVERSATION_TASKS });
}

function isLocalConfigured(configuration: AIConfiguration): boolean {
  return Boolean(configuration.localBaseUrl?.trim() && configuration.localApiKey?.trim() && configuration.localModel?.trim());
}

function isGeminiConfigured(configuration: AIConfiguration): boolean {
  return Boolean(configuration.apiKey?.trim() && configuration.model?.trim());
}

function isRetryable(kind: AIProviderFailureKind): boolean {
  return kind === 'rate_limited' || kind === 'temporarily_unavailable';
}

function hasRetryTimeRemaining(startedAt: number): boolean {
  return Date.now() - startedAt + TRANSIENT_RETRY_DELAY_MS < totalTimeoutMs;
}

function isCircuitOpen(provider: string): boolean {
  const state = circuitStates.get(provider);
  return Boolean(state && state.openUntil > Date.now());
}

function markProviderSuccess(provider: string): void {
  circuitStates.delete(provider);
}

function markProviderFailure(provider: string, kind: AIProviderFailureKind): void {
  if (!isRetryable(kind)) return;
  const previous = circuitStates.get(provider) ?? { consecutiveTransientFailures: 0, openUntil: 0 };
  const failures = previous.consecutiveTransientFailures + 1;
  circuitStates.set(provider, {
    consecutiveTransientFailures: failures,
    openUntil: failures >= CIRCUIT_FAILURE_THRESHOLD ? Date.now() + CIRCUIT_COOLDOWN_MS : 0,
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function resolveTimeout(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
