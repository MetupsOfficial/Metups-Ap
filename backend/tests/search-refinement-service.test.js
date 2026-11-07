import assert from 'node:assert/strict';
import test from 'node:test';
import { isSearchRefinementRequest, refineSearchCriteria } from '../src/search-refinement-service.js';

const prior = { category: 'laptop', budgetMax: 300, location: 'harare', condition: null };

test('a cheaper follow-up keeps the same filters and lowers the existing budget', () => {
  assert.equal(isSearchRefinementRequest('show cheaper ones'), true);
  assert.deepEqual(refineSearchCriteria(prior, {}, 'show cheaper ones', { cheaperFactor: '0.8' }), {
    ...prior, budgetMax: 240,
  });
});

test('explicit extracted filters replace only the matching prior search filter', () => {
  assert.deepEqual(refineSearchCriteria(prior, { location: 'Bulawayo', budget_max: 450 }, 'in Bulawayo under $450'), {
    category: 'laptop', budgetMax: 450, location: 'bulawayo', condition: null,
  });
});

test('a price-relative refinement needs an existing budget', () => {
  const noBudget = { ...prior, budgetMax: null };
  assert.deepEqual(refineSearchCriteria(noBudget, {}, 'show cheaper ones'), noBudget);
});

test('clear follow-up filters are recognised as refinements', () => {
  assert.equal(isSearchRefinementRequest('under $200'), true);
  assert.equal(isSearchRefinementRequest('what about in Bulawayo?'), true);
  assert.equal(isSearchRefinementRequest('used'), true);
  assert.equal(isSearchRefinementRequest('can I see more options?'), true);
});

test('a refinement preserves omitted filters and replaces explicit canonical filters', () => {
  assert.deepEqual(refineSearchCriteria(prior, { budget_max: 200 }, 'under $200'), {
    category: 'laptop', budgetMax: 200, location: 'harare', condition: null,
  });
  assert.deepEqual(refineSearchCriteria(prior, { location: 'Bulawayo' }, 'what about in Bulawayo?'), {
    category: 'laptop', budgetMax: 300, location: 'bulawayo', condition: null,
  });
  assert.deepEqual(refineSearchCriteria(prior, { condition: 'second-hand' }, 'used'), {
    category: 'laptop', budgetMax: 300, location: 'harare', condition: 'Fair',
  });
});
