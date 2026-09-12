import type { AIConfiguration, AIInput, AIProvider, AIResult, AITask } from '../types';

const MISTRAL_CHAT_COMPLETIONS_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 8_000;
let configuration: AIConfiguration = {};

/** Called only by the AI router; no webhook or business service imports this module. */
export function configureMistralProvider(nextConfiguration: AIConfiguration): void {
  configuration = nextConfiguration;
}

export const mistralProvider: AIProvider = {
  name: 'mistral',

  async process(_task: AITask, input: AIInput): Promise<AIResult> {
    if (!configuration.apiKey || !configuration.model) {
      throw new Error('Mistral AI configuration is missing');
    }

    const controller = new AbortController();
    const timeoutMs = resolveTimeout(configuration.timeoutMs);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: configuration.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: String(input.context?.instruction ?? '') },
            { role: 'user', content: JSON.stringify(compactInput(input)) },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Mistral returned ${response.status}`);

      const body = await response.json();
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Mistral did not return message content');
      return validateMistralResult(JSON.parse(content));
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

function compactInput(input: AIInput): Record<string, unknown> {
  const { instruction: _instruction, ...context } = input.context ?? {};
  return { message: input.message ?? '', imageUrls: input.imageUrls ?? [], context };
}

function validateMistralResult(value: unknown): AIResult {
  if (!value || typeof value !== 'object') throw new Error('Mistral returned invalid JSON');
  const result = value as Record<string, unknown>;
  if (typeof result.intent !== 'string' || !Number.isFinite(result.confidence)) {
    throw new Error('Mistral result is missing intent or confidence');
  }
  if (!result.extracted || typeof result.extracted !== 'object' || Array.isArray(result.extracted)) {
    throw new Error('Mistral result is missing extracted data');
  }
  return {
    intent: result.intent,
    confidence: Number(result.confidence),
    extracted: result.extracted as Record<string, unknown>,
    provider: 'mistral',
  };
}

function resolveTimeout(value: AIConfiguration['timeoutMs']): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
