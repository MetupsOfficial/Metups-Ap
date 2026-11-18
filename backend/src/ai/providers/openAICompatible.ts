import type {
  AIInput,
  AIProvider,
  AIResult,
  AITask,
  OpenAICompatibleModelConfiguration,
} from '../types';

const DEFAULT_TIMEOUT_MS = 6_000;
const MAX_OUTPUT_TOKENS = 250;

/**
 * Adapter for providers that expose OpenAI's /chat/completions contract.
 *
 * This module deliberately has no provider-specific imports. Adding another
 * compatible provider is configuration plus one router registration, not a
 * webhook or marketplace change.
 */
export function createOpenAICompatibleProvider(
  configuration: OpenAICompatibleModelConfiguration,
): AIProvider {
  const providerName = configuration.name;

  return {
    name: providerName,

    async process(_task: AITask, input: AIInput): Promise<AIResult> {
      const baseUrl = configuration.baseUrl?.trim().replace(/\/+$/, '');
      const apiKey = configuration.apiKey?.trim();
      const model = configuration.model?.trim();

      if (!baseUrl || !apiKey || !model) {
        throw new Error(`${providerName} configuration is incomplete`);
      }

      const controller = new AbortController();
      const timeoutMs = resolveTimeout(configuration.timeoutMs);
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: [
                  'You are the structured-output component of Metups AI.',
                  'Return exactly one JSON object with top-level intent (string), confidence (0 through 1), and extracted (object).',
                  'Do not write a customer-facing reply or invent facts.',
                  String(input.context?.instruction ?? 'Interpret the message and extract the relevant information.'),
                ].join('\n'),
              },
              { role: 'user', content: JSON.stringify(compactInput(input)) },
            ],
            temperature: 0,
            max_tokens: MAX_OUTPUT_TOKENS,
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.text()).slice(0, 1_000);
          throw new Error(`${providerName} returned ${response.status}: ${body || 'no error body'}`);
        }

        const body: unknown = await response.json();
        const content = isRecord(body) && Array.isArray(body.choices) && isRecord(body.choices[0])
          && isRecord(body.choices[0].message)
          ? body.choices[0].message.content
          : null;

        if (typeof content !== 'string' || !content.trim()) {
          throw new Error(`${providerName} did not return message content`);
        }

        return validateResult(JSON.parse(content), providerName);
      } catch (error) {
        if (timedOut) throw new Error(`${providerName} request timed out after ${timeoutMs}ms`);
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

function compactInput(input: AIInput): Record<string, unknown> {
  const { instruction: _instruction, ...context } = input.context ?? {};
  return { message: input.message ?? '', imageUrls: input.imageUrls ?? [], context };
}

function validateResult(value: unknown, provider: string): AIResult {
  if (!isRecord(value) || typeof value.intent !== 'string' || !value.intent.trim()) {
    throw new Error(`${provider} returned an invalid intent`);
  }
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)) {
    throw new Error(`${provider} returned an invalid confidence`);
  }
  if (!isRecord(value.extracted)) throw new Error(`${provider} returned invalid extracted data`);

  return {
    intent: value.intent,
    confidence: value.confidence,
    extracted: value.extracted,
    provider,
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveTimeout(value: string | number | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
