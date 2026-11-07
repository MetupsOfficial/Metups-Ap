import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchCriteria, normalizeSearchCondition } from '../src/search-service.js';

test('buildSearchCriteria accepts only compact validated marketplace filters', () => {
  assert.deepEqual(buildSearchCriteria({ category: ' Laptop ', budget_max: 300, location: ' Harare ', condition: 'Like New' }), {
    category: 'laptop', budgetMax: 300, location: 'harare', condition: 'Like-New',
  });
  assert.deepEqual(buildSearchCriteria({ category: '', budget_max: -1, location: null, condition: 9 }), {
    category: null, budgetMax: null, location: null, condition: null,
  });
});

test('missing budget values remain null while numeric zero remains valid', () => {
  for (const budget_max of [null, undefined, '', '   ', 'invalid', -1, Infinity, {}, []]) {
    assert.equal(buildSearchCriteria({ budget_max }).budgetMax, null);
  }
  assert.equal(buildSearchCriteria({ budget_max: 0 }).budgetMax, 0);
  assert.equal(buildSearchCriteria({ budget_max: 100 }).budgetMax, 100);
  assert.equal(buildSearchCriteria({ budget_max: '100' }).budgetMax, 100);
});

test('conditions normalize only to the canonical marketplace values', () => {
  assert.equal(normalizeSearchCondition('brand new'), 'New');
  assert.equal(normalizeSearchCondition('Like New'), 'Like-New');
  assert.equal(normalizeSearchCondition('second-hand'), 'Fair');
  assert.equal(normalizeSearchCondition('pre-owned'), 'Fair');
  assert.equal(normalizeSearchCondition('needs repair'), 'Needs Repair');
  assert.equal(normalizeSearchCondition('Good'), null);
  assert.equal(buildSearchCriteria({ condition: 'used' }).condition, 'Fair');
});
