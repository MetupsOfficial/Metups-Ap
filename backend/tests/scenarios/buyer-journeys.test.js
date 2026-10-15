import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchCriteria } from '../../src/search-service.js';
import { rankProducts } from '../../src/ranking-service.js';
import { refineSearchCriteria } from '../../src/search-refinement-service.js';
import { clearBuyerSearchContext, productShareUrl, selectSearchResult, sellerWhatsAppUrl } from '../../src/buyer-selection-service.js';
import { formatResults, formatUnknownRequest, formatZeroResults } from '../../utils/formatter.js';

const products = [
  { id: 'phone-1', title: 'Samsung S21', description: 'Good phone', price: 220, category: 'phones', location: 'harare', condition: 'Fair', created_at: '2026-10-15T10:00:00Z', seller: { rating_avg: 4.8, rating_count: 12, phone_verified: true } },
  { id: 'phone-2', title: 'Samsung A52', description: 'Phone', price: 180, category: 'phones', location: 'harare', condition: 'Fair', created_at: '2026-10-14T10:00:00Z' },
];

test('scenario: anonymous buyer searches, refines, selects, and receives both contact routes', () => {
  const criteria = buildSearchCriteria({ category: 'phone', budget_max: 250, location: 'Harare', condition: null });
  const results = rankProducts(products, criteria, { now: '2026-10-16T10:00:00Z' });
  const reply = formatResults(results, criteria);
  const sessionSearch = { criteria, resultIds: results.map(result => result.id) };

  assert.match(reply, /Samsung S21/);
  assert.deepEqual(selectSearchResult('1', sessionSearch.resultIds), { matched: true, productId: 'phone-1' });
  assert.equal(productShareUrl('https://metups.com', 'phone-1'), 'https://metups.com/features/products/product.html?id=phone-1');
  assert.match(sellerWhatsAppUrl('+263 78 461 7009', 'Samsung S21'), /^https:\/\/wa\.me\/263784617009/);

  const refined = refineSearchCriteria(criteria, {}, 'show cheaper ones', { cheaperFactor: 0.8 });
  assert.equal(refined.budgetMax, 200);
});

test('scenario: zero results, unclear request, and cancellation each give a safe next action', () => {
  assert.match(formatZeroResults({ category: 'laptop', budgetMax: 100 }), /higher budget/i);
  assert.match(formatUnknownRequest(), /Try:/i);
  assert.deepEqual(clearBuyerSearchContext({ search: { resultIds: ['phone-1'] }, locale: 'en' }), { locale: 'en' });
});
