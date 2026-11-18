import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyProviderFailure } from '../src/ai/provider-failure.ts';

test('AI router classifies retryable provider failures', () => {
  assert.equal(
    classifyProviderFailure(new Error('Gemini returned 503: high demand')),
    'temporarily_unavailable',
  );
  assert.equal(
    classifyProviderFailure(new Error('Groq returned 429: rate limit exceeded')),
    'rate_limited',
  );
});

test('AI router avoids retrying unsafe provider failures', () => {
  assert.equal(
    classifyProviderFailure(new Error('OpenAI returned 401: invalid API key')),
    'authentication_or_configuration',
  );
  assert.equal(
    classifyProviderFailure(new Error('Mistral returned invalid JSON')),
    'invalid_response',
  );
  assert.equal(
    classifyProviderFailure(new Error('Cerebras request timed out after 6000ms')),
    'timeout',
  );
});
