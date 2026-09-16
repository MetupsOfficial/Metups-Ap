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
