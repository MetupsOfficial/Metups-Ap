import type { AIConfiguration, AIInput, AIProvider, AIResult, AITask } from '../types';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 250;
let configuration: AIConfiguration = {};

/** Called only by the AI router; no webhook or business service imports this module. */
export function configureGeminiProvider(nextConfiguration: AIConfiguration): void {
  configuration = nextConfiguration;
}

export const geminiProvider: AIProvider = {
  name: 'gemini',

  async process(_task: AITask, input: AIInput): Promise<AIResult> {
    if (!configuration.apiKey || !configuration.model) {
      throw new Error('Gemini AI configuration is missing');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), resolveTimeout(configuration.timeoutMs));
    try {
      const response = await fetch(`${GEMINI_API_BASE_URL}/${encodeURIComponent(configuration.model)}:generateContent`, {
        method: 'POST',
        headers: {
          'x-goog-api-key': configuration.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: String(input.context?.instruction ?? '') }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(compactInput(input)) }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Gemini returned ${response.status}`);

      const body = await response.json();
      const content = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof content !== 'string') throw new Error('Gemini did not return message content');
      return validateGeminiResult(JSON.parse(content));
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

function compactInput(input: AIInput): Record<string, unknown> {
  const { instruction: _instruction, ...context } = input.context ?? {};
  return { message: input.message ?? '', imageUrls: input.imageUrls ?? [], context };
}

function validateGeminiResult(value: unknown): AIResult {
  if (!value || typeof value !== 'object') throw new Error('Gemini returned invalid JSON');
  const result = value as Record<string, unknown>;
  if (typeof result.intent !== 'string' || !Number.isFinite(result.confidence)) {
    throw new Error('Gemini result is missing intent or confidence');
  }
  if (!result.extracted || typeof result.extracted !== 'object' || Array.isArray(result.extracted)) {
    throw new Error('Gemini result is missing extracted data');
  }
  return {
    intent: result.intent,
    confidence: Number(result.confidence),
    extracted: result.extracted as Record<string, unknown>,
    provider: 'gemini',
  };
}

function resolveTimeout(value: AIConfiguration['timeoutMs']): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}
