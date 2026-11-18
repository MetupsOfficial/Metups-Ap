
import type { AIInput, AIProvider, AIResult, AITask } from '../types';
import { buildConversationTaskInput } from '../tasks/conversation';
import { validateConversationResult } from '../conversation-validation.js';

export const WORKERS_AI_MODELS = [
  '@cf/zai-org/glm-4.7-flash',
  '@cf/google/gemma-4-26b-a4b-it',
] as const;

export type WorkersAIModel = (typeof WORKERS_AI_MODELS)[number];

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_TOKENS = 250;

export interface WorkersAIBenchmarkResult {
  provider: 'cloudflare_workers_ai';
  model: WorkersAIModel;
  success: boolean;
  result: AIResult | null;
  latencyMs: number;
  attempts: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
  error: string | null;
}

export function isWorkersAIModel(value: unknown): value is WorkersAIModel {
  return typeof value === 'string' &&
    WORKERS_AI_MODELS.includes(value as WorkersAIModel);
}

/**
 * Converts either supported Workers AI model into the common provider
 * contract. It is intentionally separate from the benchmark route so the
 * rest of the Worker never knows about a Workers AI model name.
 */
export function createWorkersAIProvider(
  name: string,
  ai: Ai,
  model: WorkersAIModel,
  timeoutMs?: string | number,
): AIProvider {
  return {
    name,
    async process(_task: AITask, input: AIInput): Promise<AIResult> {
      const result = await runWorkersAIBenchmark(
        ai,
        model,
        input,
        resolveTimeout(timeoutMs),
      );

      if (!result.success || !result.result) {
        throw new Error(`${name} failed: ${result.error ?? 'Unknown Workers AI error'}`);
      }

      return { ...result.result, provider: name };
    },
  };
}

function compactInput(input: AIInput): Record<string, unknown> {
  const { instruction: _instruction, ...context } = input.context ?? {};

  return {
    message: input.message ?? '',
    imageUrls: input.imageUrls ?? [],
    context,
  };
}

export async function runWorkersAIBenchmark(
  ai: Ai,
  model: WorkersAIModel,
  input: AIInput,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<WorkersAIBenchmarkResult> {
  const startedAt = Date.now();
  let attempts = 0;
  let usage: WorkersAIBenchmarkResult['usage'] = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    attempts += 1;

    const taskInput = buildConversationTaskInput(input, attempt);
    const controller = new AbortController();

    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await ai.run(
        model,
        {
          messages: [
            {
              role: 'system',
              content: String(taskInput.context?.instruction ?? ''),
            },
            {
              role: 'user',
              content: JSON.stringify(compactInput(taskInput)),
            },
          ],
          temperature: 0,
          max_tokens: MAX_OUTPUT_TOKENS,
          response_format: { type: 'json_object' },
          chat_template_kwargs: {
            enable_thinking: false,
          },
        },
        { signal: controller.signal },
      );

      if (response.usage) {
        usage = {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        };
      }

      const content = response.choices?.[0]?.message?.content;

      if (typeof content !== 'string' || !content.trim()) {
        lastError = 'Model returned empty or missing message content';
        continue;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = 'Model returned invalid JSON';
        continue;
      }

      const validated = validateConversationResult(parsed, input.message);

      if (!validated) {
        lastError = 'Model output failed conversation validation';
        continue;
      }

      return {
        provider: 'cloudflare_workers_ai',
        model,
        success: true,
        result: {
          ...validated,
          provider: 'cloudflare_workers_ai',
        },
        latencyMs: Date.now() - startedAt,
        attempts,
        usage,
        error: null,
      };
    } catch (error) {
      lastError = timedOut
        ? `Request timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : 'Unknown Workers AI error';

      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    provider: 'cloudflare_workers_ai',
    model,
    success: false,
    result: null,
    latencyMs: Date.now() - startedAt,
    attempts,
    usage,
    error: lastError,
  };
}

function resolveTimeout(value: string | number | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
