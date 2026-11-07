import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyFastIntent } from '../src/fast-intent-service.ts';

test('fast intent recognises common conversation commands without AI', () => {
  assert.equal(classifyFastIntent('Hello')?.intent, 'greeting');
  assert.equal(classifyFastIntent('HELP')?.intent, 'help');
  assert.equal(classifyFastIntent('cancel search')?.intent, 'cancel');
  assert.equal(
    classifyFastIntent('I want to upload a product photo')?.intent,
    'sell_product'
  );
});

test('fast intent extracts a buyer search into the existing criteria schema', () => {
  const result = classifyFastIntent(
    'Looking for a laptop under $300 in Harare'
  );

  assert.equal(result?.intent, 'search_product');
  assert.equal(result?.provider, 'rules');

  assert.deepEqual(result?.extracted, {
    category: 'laptop',
    budget_max: 300,
    location: 'harare',
    condition: null,
  });
});

test('fast intent leaves ambiguous messages for the AI provider', () => {
  assert.equal(
    classifyFastIntent('Can you explain that?'),
    null
  );
});

test('fast intent recognises natural-language seller requests', () => {
  const result = classifyFastIntent('I want to sell my old sofa.');

  assert.equal(result?.intent, 'sell_product');
});

test('fast intent extracts used product, location and budget', () => {
  const result = classifyFastIntent(
    'Show me a used television in Mutare under USD 80.'
  );

  assert.equal(result?.intent, 'search_product');

  assert.deepEqual(result?.extracted, {
    category: 'television',
    budget_max: 80,
    location: 'mutare',
    condition: 'Fair',
  });
});

test('fast intent extracts second-hand product filters', () => {
  const result = classifyFastIntent(
    'Find a second-hand fridge in Harare under $100'
  );

  assert.equal(result?.intent, 'search_product');

  assert.deepEqual(result?.extracted, {
    category: 'fridge',
    budget_max: 100,
    location: 'harare',
    condition: 'Fair',
  });
});

test('fast intent recognises brand-new products', () => {
  const result = classifyFastIntent(
    'Looking for a brand new laptop in Bulawayo'
  );

  assert.equal(result?.intent, 'search_product');

  assert.deepEqual(result?.extracted, {
    category: 'laptop',
    budget_max: null,
    location: 'bulawayo',
    condition: 'New',
  });
});

test('fast intent keeps a location-only follow-up free of a fake category', () => {
  const result = classifyFastIntent('What about in Bulawayo?');

  assert.equal(result?.intent, 'search_product');
  assert.deepEqual(result?.extracted, {
    category: null,
    budget_max: null,
    location: 'bulawayo',
    condition: null,
  });
});

test('fast intent removes conversational filler from clear buyer searches', () => {
  const cases = [
    ['Find me a fridge.', 'fridge'],
    ['I need a sofa.', 'sofa'],
    ['I want to buy a laptop.', 'laptop'],
    ['Show me phones.', 'phones'],
    ['Search for a washing machine.', 'washing machine'],
    ['Do you have beds?', 'beds'],
    ['I am interested in buying a desk.', 'desk'],
  ];

  for (const [message, category] of cases) {
    const result = classifyFastIntent(message);
    assert.equal(result?.intent, 'search_product', message);
    assert.equal(result?.extracted.category, category, message);
  }
});
