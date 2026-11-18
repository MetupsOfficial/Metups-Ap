export type AIProviderFailureKind =
  | 'rate_limited'
  | 'temporarily_unavailable'
  | 'timeout'
  | 'authentication_or_configuration'
  | 'invalid_response'
  | 'unknown';

/** Maps provider errors to safe retry/fallback decisions without exposing secrets. */
export function classifyProviderFailure(error: unknown): AIProviderFailureKind {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (/\b429\b|rate.?limit|quota/.test(message)) return 'rate_limited';
  if (/\b503\b|high demand|temporar(?:y|ily) unavailable|overloaded/.test(message)) return 'temporarily_unavailable';
  if (/timed out|aborted|aborterror/.test(message)) return 'timeout';
  if (/\b401\b|\b403\b|\b404\b|configuration is incomplete|configuration is missing|invalid api key|unauthori[sz]ed/.test(message)) {
    return 'authentication_or_configuration';
  }
  if (/invalid json|invalid api response|invalid intent|invalid confidence|invalid extracted|did not return message content|missing message content/.test(message)) {
    return 'invalid_response';
  }
  return 'unknown';
}
