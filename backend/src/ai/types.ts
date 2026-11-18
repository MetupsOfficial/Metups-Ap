export interface AIProvider {
  name: string;
  process(task: AITask, input: AIInput): Promise<AIResult>;
}

/** A configured model endpoint that uses an OpenAI-compatible chat API. */
export interface OpenAICompatibleModelConfiguration {
  /** A label used in logs and returned in AIResult.provider; never a secret. */
  name: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: string | number;
}

export type AITask =
  | 'buyer_search'
  | 'seller_listing'
  | 'conversation'
  | 'image_analysis';

export interface AIInput {
  message?: string;
  imageUrls?: string[];
  context?: Record<string, unknown>;
}

export interface AIResult {
  intent: string;
  extracted: Record<string, unknown>;
  confidence: number;
  provider: string;
}

export interface AIConfiguration {
  /** Maximum time the router should spend retrying before moving on. */
  totalTimeoutMs?: string | number;

  // Gemini configuration
  apiKey?: string;
  model?: string;
  timeoutMs?: string | number;

  // Local llama.cpp configuration
  localBaseUrl?: string;
  localApiKey?: string;
  localModel?: string;
  localTimeoutMs?: string | number;

  // Cloudflare Workers AI. The binding is optional so local development and
  // accounts without Workers AI continue to work.
  workersAI?: Ai;
  workersAIGlmModel?: string;
  workersAIGemmaModel?: string;
  workersAITimeoutMs?: string | number;

  // External providers use the same OpenAI-compatible adapter. A provider is
  // enabled only when its base URL, key, and model are all configured.
  groqFast?: OpenAICompatibleModelConfiguration;
  groqReasoning?: OpenAICompatibleModelConfiguration;
  mistralFast?: OpenAICompatibleModelConfiguration;
  mistralStrong?: OpenAICompatibleModelConfiguration;
  openAIFast?: OpenAICompatibleModelConfiguration;
  openAINano?: OpenAICompatibleModelConfiguration;
  cerebrasFast?: OpenAICompatibleModelConfiguration;
}
