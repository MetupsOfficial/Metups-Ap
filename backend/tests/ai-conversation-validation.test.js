import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConversationResult } from '../src/ai/conversation-validation.js';

const valid = (overrides = {}) => ({
  intent: 'search_product', confidence: 0.9, provider: 'test',
  extracted: { category: 'fridge', budget_max: 100, location: 'Harare', condition: null },
  ...overrides,
});

test('conversation validation canonicalizes supported customer condition language', () => {
  assert.equal(validateConversationResult(valid({ extracted: { category: 'fridge', budget_max: null, location: null, condition: 'second-hand' } }))?.extracted.condition, 'Fair');
});

test('conversation validation rejects unsafe model output', () => {
  assert.equal(validateConversationResult(valid({ intent: 'not_an_intent' })), null);
  assert.equal(validateConversationResult(valid({ confidence: Infinity })), null);
  assert.equal(validateConversationResult(valid({ extracted: { category: 'search_product', budget_max: null, location: null, condition: null } })), null);
  assert.equal(validateConversationResult(valid({ extracted: { category: 'fridge', budget_max: -1, location: null, condition: null } })), null);
  assert.equal(validateConversationResult(valid({ extracted: { category: 'fridge', budget_max: null, location: null, condition: 'excellent' } })), null);
});

test('conversation validation never accepts a greeting for an explicit search', () => {
  assert.equal(validateConversationResult(valid({ intent: 'greeting' }), 'Find me a fridge'), null);
});
