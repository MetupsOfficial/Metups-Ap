import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFastIntent } from '../src/fast-intent-service.ts';

test('fast intent recognises common conversation commands without AI', () => {
  assert.equal(classifyFastIntent('Hello')?.intent, 'greeting');
  assert.equal(classifyFastIntent('HELP')?.intent, 'help');
  assert.equal(classifyFastIntent('cancel search')?.intent, 'cancel');
  assert.equal(classifyFastIntent('I want to upload a product photo')?.intent, 'sell_product');
});

test('fast intent extracts a buyer search into the existing criteria schema', () => {
  const result = classifyFastIntent('Looking for a laptop under $300 in Harare');
  assert.equal(result?.intent, 'search_product');
  assert.equal(result?.provider, 'rules');
  assert.deepEqual(result?.extracted, {
    category: 'laptop', budget_max: 300, location: 'harare', condition: null,
  });
});

test('fast intent leaves ambiguous messages for Gemini', () => {
  assert.equal(classifyFastIntent('Can you explain that?'), null);
});
