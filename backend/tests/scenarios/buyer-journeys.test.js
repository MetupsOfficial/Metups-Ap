import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchCriteria } from '../../src/search-service.js';
import { rankProducts } from '../../src/ranking-service.js';
import { refineSearchCriteria } from '../../src/search-refinement-service.js';
import { buildSearchContext, getSeenProductIds } from '../../src/search-history-service.js';
import { buildSearchDraft, nextSearchClarification, resolveSearchDraftAnswer } from '../../src/buyer-conversation-service.js';
import { clearBuyerSearchContext, productShareUrl, selectSearchResult, sellerWhatsAppUrl } from '../../src/buyer-selection-service.js';
import { formatCarouselSearchIntro, formatResults, formatSearchClarification, formatSearchExhausted, formatUnknownRequest, formatZeroResults } from '../../utils/formatter.js';

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
  assert.match(formatUnknownRequest(), /Tell me the item and town/i);
  assert.deepEqual(clearBuyerSearchContext({ search: { resultIds: ['phone-1'] }, locale: 'en' }), { locale: 'en' });
});

test('scenario: incremental results do not repeat, retain only latest selections, and exhaust honestly', () => {
  const sevenListings = Array.from({ length: 7 }, (_, index) => ({
    id: `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-${index + 1}${index + 1}${index + 1}${index + 1}-4${index + 1}${index + 1}${index + 1}-8${index + 1}${index + 1}${index + 1}-${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}`,
    title: `Fridge ${index + 1}`,
    description: 'Fridge',
    price: 100 - index,
    category: 'fridge',
    location: 'harare',
    condition: 'Fair',
    created_at: `2026-10-${String(20 - index).padStart(2, '0')}T00:00:00Z`,
  }));
  const criteria = { category: 'fridge', budgetMax: 100, location: 'harare', condition: 'Fair' };
  const batch = search => rankProducts(
    sevenListings.filter(product => !getSeenProductIds(search).includes(product.id)),
    criteria,
    { now: '2026-10-20T00:00:00Z' },
  );

  const first = batch(null);
  const firstSearch = buildSearchContext(criteria, first);
  const second = batch(firstSearch);
  const secondSearch = buildSearchContext(criteria, second, firstSearch);
  const third = batch(secondSearch);
  const thirdSearch = buildSearchContext(criteria, third, secondSearch);
  const fourth = batch(thirdSearch);

  assert.equal(first.length, 3);
  assert.equal(second.length, 3);
  assert.equal(third.length, 1);
  assert.equal(fourth.length, 0);
  assert.deepEqual(secondSearch.resultIds, second.map(product => product.id));
  assert.equal(new Set(thirdSearch.seenProductIds).size, 7);
  assert.equal(getSeenProductIds(thirdSearch).length, 7);
  assert.deepEqual(selectSearchResult('1', thirdSearch.resultIds), { matched: true, productId: third[0].id });
  assert.deepEqual(selectSearchResult('2', thirdSearch.resultIds), { matched: true, productId: null });
});

test('scenario: a buyer supplies details naturally, then receives contextual next steps', () => {
  const initial = buildSearchCriteria({ category: 'fridge', budget_max: null, location: null, condition: null });
  const clarification = nextSearchClarification(initial);
  assert.deepEqual(clarification, { pendingQuestion: 'location' });
  assert.match(formatSearchClarification(initial, clarification.pendingQuestion), /Which town/i);

  const resolved = resolveSearchDraftAnswer(buildSearchDraft(initial, clarification.pendingQuestion), 'Harare under $100');
  assert.deepEqual(resolved, {
    criteria: { category: 'fridge', budgetMax: 100, location: 'harare', condition: null },
    clarification: null,
  });
  assert.match(formatCarouselSearchIntro(resolved.criteria, 3), /ask for more options or try another town/i);
  assert.match(formatSearchExhausted(resolved.criteria), /different town, a higher budget, or another product/i);
});
