import test from 'node:test';
import assert from 'node:assert/strict';
import { formatResults, formatSelectedProduct } from '../utils/formatter.js';

test('formatResults includes a selection prompt for the next step', () => {
  const message = formatResults([
    { title: 'Samsung S21', price: 220, location: 'Harare' }
  ], { category: 'samsung s21' });

  assert.match(message, /Reply with a number/i);
  assert.match(message, /1️⃣/);
});

test('formatResults gives zero-result searches a clear next action', () => {
  const message = formatResults([], { category: 'laptop', budgetMax: 300 });

  assert.match(message, /No matches/i);
  assert.match(message, /higher budget/i);
});

test('selected product reply includes a direct share link and report action', () => {
  const message = formatSelectedProduct({ title: 'Samsung S21', price: 220 }, 'https://metups.com/product/p-1');
  assert.match(message, /https:\/\/metups\.com\/product\/p-1/);
  assert.match(message, /REPORT/i);
});
