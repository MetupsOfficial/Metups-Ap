import test from 'node:test';
import assert from 'node:assert/strict';
import { formatGreeting, formatHelp, formatResults, formatSearchCancelled, formatSelectedProduct, formatSellerWebsiteRedirect, formatUnknownRequest } from '../utils/formatter.js';

test('formatResults includes a selection prompt for the next step', () => {
  const message = formatResults([
    { title: 'Samsung S21', price: 220, location: 'Harare', seller: { rating_avg: 4.8, rating_count: 12, phone_verified: true } }
  ], { category: 'samsung s21' });

  assert.match(message, /Reply with a number/i);
  assert.match(message, /1️⃣/);
  assert.match(message, /4\.8 \(12 reviews\)/);
  assert.match(message, /Phone verified/);
});

test('formatResults gives zero-result searches a clear next action', () => {
  const message = formatResults([], { category: 'laptop', budgetMax: 300 });

  assert.match(message, /No matches/i);
  assert.match(message, /higher budget/i);
});

test('selected product reply includes a direct share link and report action', () => {
  const message = formatSelectedProduct(
    { title: 'Samsung S21', price: 220, seller: { full_name: 'Tendai' } },
    'https://metups.com/features/products/product.html?id=p-1',
    'https://wa.me/263784617009?text=hello',
  );
  assert.match(message, /https:\/\/metups\.com\/features\/products\/product\.html\?id=p-1/);
  assert.match(message, /https:\/\/wa\.me\/263784617009/);
  assert.match(message, /REPORT/i);
});

test('seller requests receive the existing website listing route', () => {
  assert.match(formatSellerWebsiteRedirect('https://metups.com/'), /https:\/\/metups\.com\/features\/products\/add_product\.html/);
});

test('basic buyer replies provide a next action', () => {
  for (const response of [formatGreeting(), formatHelp(), formatSearchCancelled(), formatUnknownRequest()]) {
    assert.ok(response.length > 20);
  }
});
