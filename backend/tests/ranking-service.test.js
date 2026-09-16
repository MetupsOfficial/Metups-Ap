import assert from 'node:assert/strict';
import test from 'node:test';
import { rankProducts } from '../src/ranking-service.js';

const criteria = { category: 'laptop', budgetMax: 300, location: 'harare', condition: null };
const products = [
  { id: 'best', title: 'Dell Laptop', description: 'Fast laptop', category: 'Electronics', location: 'Harare', price: 280, created_at: '2026-09-15T00:00:00Z', seller: { rating_avg: 4.8, rating_count: 20 } },
  { id: 'other', title: 'Office chair', description: 'Not a laptop', category: 'Furniture', location: 'Bulawayo', price: 100, created_at: '2026-09-16T00:00:00Z', seller: { rating_avg: 0, rating_count: 0 } },
  { id: 'old', title: 'Laptop bag', description: 'Used', category: 'Electronics', location: 'Harare', price: 200, created_at: '2025-01-01T00:00:00Z', seller: { rating_avg: 3, rating_count: 1 } },
  { id: 'four', title: 'Laptop', description: 'Spare', category: 'Electronics', location: 'Harare', price: 299, created_at: '2026-09-01T00:00:00Z', seller: {} },
];

test('ranks relevant listings and limits results to the best three', () => {
  const results = rankProducts(products, criteria, { now: '2026-09-16T00:00:00Z' });
  assert.equal(results.length, 3);
  // The exact title and closest non-exceeding budget fit rank first.
  assert.equal(results[0].id, 'four');
  assert.equal(results.some(result => result.id === 'other'), false);
});

test('ranking does not mutate the raw product collection', () => {
  const copy = structuredClone(products);
  rankProducts(products, criteria, { now: '2026-09-16T00:00:00Z' });
  assert.deepEqual(products, copy);
});
