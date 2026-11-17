import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchContext, getSeenProductIds, hasSearchCriteriaChanged, normaliseProductIds } from '../src/search-history-service.js';

const IDS = Object.freeze({
  first: '11111111-1111-4111-8111-111111111111',
  second: '22222222-2222-4222-8222-222222222222',
  third: '33333333-3333-4333-8333-333333333333',
  fourth: '44444444-4444-4444-8444-444444444444',
});

const criteria = { category: 'fridge', budgetMax: 100, location: 'harare', condition: 'Fair' };

test('normaliseProductIds accepts only unique product UUIDs', () => {
  assert.deepEqual(normaliseProductIds([
    IDS.first,
    IDS.first.toUpperCase(),
    'not-a-product-id',
    '',
    null,
    42,
    IDS.second,
  ]), [IDS.first, IDS.second]);
});

test('getSeenProductIds keeps legacy sessions compatible with resultIds', () => {
  assert.deepEqual(getSeenProductIds({ resultIds: [IDS.first, IDS.second] }), [IDS.first, IDS.second]);
  assert.deepEqual(getSeenProductIds({
    seenProductIds: [IDS.first, IDS.second],
    resultIds: [IDS.second, IDS.third],
  }), [IDS.first, IDS.second, IDS.third]);
});

test('buildSearchContext keeps latest selections separate from complete display history', () => {
  const firstBatch = buildSearchContext(criteria, [{ id: IDS.first }, { id: IDS.second }, { id: IDS.third }]);
  const nextBatch = buildSearchContext(criteria, [{ id: IDS.fourth }], firstBatch);

  assert.deepEqual(firstBatch, {
    criteria,
    resultIds: [IDS.first, IDS.second, IDS.third],
    seenProductIds: [IDS.first, IDS.second, IDS.third],
  });
  assert.deepEqual(nextBatch, {
    criteria,
    resultIds: [IDS.fourth],
    seenProductIds: [IDS.first, IDS.second, IDS.third, IDS.fourth],
  });
});

test('a material search change can reset display history', () => {
  const previousSearch = {
    criteria,
    resultIds: [IDS.third],
    seenProductIds: [IDS.first, IDS.second, IDS.third],
  };
  const nextCriteria = { ...criteria, category: 'laptop', location: 'bulawayo' };

  assert.deepEqual(buildSearchContext(nextCriteria, [{ id: IDS.fourth }], previousSearch, {
    resetHistory: true,
  }), {
    criteria: nextCriteria,
    resultIds: [IDS.fourth],
    seenProductIds: [IDS.fourth],
  });
});

test('hasSearchCriteriaChanged distinguishes pagination from filter changes', () => {
  assert.equal(hasSearchCriteriaChanged(criteria, { ...criteria }), false);
  assert.equal(hasSearchCriteriaChanged(criteria, { ...criteria, budgetMax: 80 }), true);
  assert.equal(hasSearchCriteriaChanged(criteria, { ...criteria, location: 'bulawayo' }), true);
});

test('paging preserves a selected listing for reporting without changing current result IDs', () => {
  const previousSearch = {
    criteria,
    resultIds: [IDS.third],
    seenProductIds: [IDS.first, IDS.second, IDS.third],
    selectedProductId: IDS.second,
  };
  const paged = buildSearchContext(criteria, [{ id: IDS.fourth }], previousSearch);
  const reset = buildSearchContext({ ...criteria, category: 'laptop' }, [{ id: IDS.fourth }], previousSearch, {
    resetHistory: true,
  });

  assert.deepEqual(paged.resultIds, [IDS.fourth]);
  assert.equal(paged.selectedProductId, IDS.second);
  assert.equal('selectedProductId' in reset, false);
});
