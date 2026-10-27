export interface AIProvider {
  name: string;
  process(task: AITask, input: AIInput): Promise<AIResult>;
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
  // Gemini configuration
  apiKey?: string;
  model?: string;
  timeoutMs?: string | number;

  // Local llama.cpp configuration
  localBaseUrl?: string;
  localApiKey?: string;
  localModel?: string;
  localTimeoutMs?: string | number;
}