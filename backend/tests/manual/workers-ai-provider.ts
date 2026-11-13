
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runWorkersAIBenchmark,
  isWorkersAIModel,
} from '../../src/ai/providers/workersAI';

const MODEL = '@cf/zai-org/glm-4.7-flash';

const INPUT = {
  message: 'Find me a fridge in Harare under $100',
  context: {
    currentIntent: 'idle',
    currentStage: null,
    extractedFilters: {},
  },
};

function mockAI(responses: unknown[]) {
  let calls = 0;

  const ai = {
    async run(_model: string, _input: unknown, _options: unknown) {
      const response = responses[calls++];

      if (response instanceof Error) {
        throw response;
      }

      return response;
    },
  };

  return {
    ai: ai as unknown as Ai,
    getCalls: () => calls,
  };
}

function validResponse() {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            intent: 'search_product',
            confidence: 0.98,
            extracted: {
              category: 'fridge',
              budget_max: 100,
              location: 'Harare',
              condition: null,
            },
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 40,
      total_tokens: 140,
    },
  };
}

test('accepts a valid Workers AI classification', async () => {
  const mock = mockAI([validResponse()]);

  const result = await runWorkersAIBenchmark(
    mock.ai,
    MODEL,
    INPUT,
  );

  assert.equal(result.success, true);
  assert.equal(result.provider, 'cloudflare_workers_ai');
  assert.equal(result.model, MODEL);
  assert.equal(result.result?.intent, 'search_product');
  assert.equal(result.result?.extracted.category, 'fridge');
  assert.equal(result.attempts, 1);
  assert.equal(result.usage?.totalTokens, 140);
  assert.equal(mock.getCalls(), 1);
});

test('retries once when the model returns invalid JSON', async () => {
  const mock = mockAI([
    {
      choices: [
        {
          message: {
            content: 'This is not JSON',
          },
        },
      ],
    },
    validResponse(),
  ]);

  const result = await runWorkersAIBenchmark(
    mock.ai,
    MODEL,
    INPUT,
  );

  assert.equal(result.success, true);
  assert.equal(result.attempts, 2);
  assert.equal(mock.getCalls(), 2);
});

test('does not accept an invalid classification after retry', async () => {
  const invalidResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            intent: 'greeting',
            confidence: 0.95,
            extracted: {
              category: null,
              budget_max: null,
              location: null,
              condition: null,
            },
          }),
        },
      },
    ],
  };

  const mock = mockAI([invalidResponse, invalidResponse]);

  const result = await runWorkersAIBenchmark(
    mock.ai,
    MODEL,
    INPUT,
  );

  assert.equal(result.success, false);
  assert.equal(result.attempts, 2);
  assert.equal(result.error, 'Model output failed conversation validation');
});

test('handles provider errors without retrying', async () => {
  const mock = mockAI([
    new Error('Simulated provider failure'),
  ]);

  const result = await runWorkersAIBenchmark(
    mock.ai,
    MODEL,
    INPUT,
  );

  assert.equal(result.success, false);
  assert.equal(result.attempts, 1);
  assert.match(result.error ?? '', /Simulated provider failure/);
});

test('accepts only the two benchmark models', () => {
  assert.equal(isWorkersAIModel('@cf/zai-org/glm-4.7-flash'), true);

  assert.equal(
    isWorkersAIModel('@cf/google/gemma-4-26b-a4b-it'),
    true,
  );

  assert.equal(isWorkersAIModel('@cf/meta/llama-3'), false);
});
