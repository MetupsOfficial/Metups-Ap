import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchCriteria } from '../src/search-service.js';

test('buildSearchCriteria accepts only compact validated marketplace filters', () => {
  assert.deepEqual(buildSearchCriteria({ category: ' Laptop ', budget_max: 300, location: ' Harare ', condition: 'Good' }), {
    category: 'laptop', budgetMax: 300, location: 'harare', condition: 'good',
  });
  assert.deepEqual(buildSearchCriteria({ category: '', budget_max: -1, location: null, condition: 9 }), {
    category: null, budgetMax: null, location: null, condition: null,
  });
});
