import type {
  AIConfiguration,
  AIInput,
  AIProvider,
  AIResult,
  AITask,
} from '../types';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 160;

let configuration: AIConfiguration = {};

export function configureLocalLlamaProvider(
  nextConfiguration: AIConfiguration,
): void {
  configuration = nextConfiguration;
}

const AI_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    extracted: {
      type: 'object',
    },
  },
  required: ['intent', 'confidence', 'extracted'],
  additionalProperties: false,
};

export const localLlamaProvider: AIProvider = {
  name: 'local_llama',

  async process(_task: AITask, input: AIInput): Promise<AIResult> {
    const baseUrl = configuration.localBaseUrl?.trim().replace(/\/+$/, '');
    const apiKey = configuration.localApiKey?.trim();
    const model = configuration.localModel?.trim();

    if (!baseUrl || !apiKey || !model) {
      throw new Error('Local AI configuration is incomplete');
    }

    const taskInstruction = String(
      input.context?.instruction ??
        'Interpret the message and extract the relevant information.',
    );

    const controller = new AbortController();
    const timeoutMs = resolveTimeout(configuration.localTimeoutMs);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(
        `${baseUrl}/v1/chat/completions`,
        {
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
                  'Return exactly one JSON object with these top-level fields:',
                  'intent (string), confidence (number from 0 to 1), and extracted (object).',
                  'Put task-specific information inside extracted.',
                  'Do not write a customer-facing reply.',
                  'Do not invent information that is not present in the message or supplied context.',
                  'Follow these task instructions:',
                  taskInstruction,
                ].join('\n'),
              },
              {
                role: 'user',
                content: JSON.stringify(compactInput(input)),
              },
            ],
            temperature: 0,
            max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
            reasoning_effort: 'none',
            chat_template_kwargs: {
              enable_thinking: false,
            },
            response_format: {
              type: 'json_object',
            },
            // llama.cpp-specific format tested with the local Qwen server.
            json_schema: AI_RESULT_SCHEMA,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Local AI returned HTTP ${response.status}`);
      }

      const body: unknown = await response.json();

      if (!isRecord(body)) {
        throw new Error('Local AI returned an invalid API response');
      }

      const choices = body.choices;

      if (!Array.isArray(choices) || !isRecord(choices[0])) {
        throw new Error('Local AI returned no completion choices');
      }

      const message = choices[0].message;

      if (!isRecord(message) || typeof message.content !== 'string') {
        throw new Error('Local AI did not return message content');
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(message.content);
      } catch {
        throw new Error('Local AI returned invalid JSON');
      }

      return validateAIResult(parsed);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`Local AI request timed out after ${timeoutMs} ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

function compactInput(input: AIInput): Record<string, unknown> {
  const { instruction: _instruction, ...context } = input.context ?? {};

  return {
    message: input.message ?? '',
    imageUrls: input.imageUrls ?? [],
    context,
  };
}

function validateAIResult(value: unknown): AIResult {
  if (!isRecord(value)) {
    throw new Error('Local AI returned invalid JSON structure');
  }

  if (
    typeof value.intent !== 'string' ||
    !value.intent.trim()
  ) {
    throw new Error('Local AI result is missing intent');
  }

  if (
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new Error('Local AI returned invalid confidence');
  }

  if (!isRecord(value.extracted)) {
    throw new Error('Local AI result is missing extracted data');
  }

  return {
    intent: value.intent,
    confidence: value.confidence,
    extracted: value.extracted,
    provider: 'local_llama',
  };
}

function isRecord(value: unknown): value is Record<string, any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function resolveTimeout(value: AIConfiguration['localTimeoutMs']): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TIMEOUT_MS;
}