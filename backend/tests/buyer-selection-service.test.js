import assert from 'node:assert/strict';
import test from 'node:test';
import { productShareUrl, selectSearchResult } from '../src/buyer-selection-service.js';

test('selection resolves only within the current session result IDs', () => {
  assert.deepEqual(selectSearchResult('2', ['product-a', 'product-b']), { matched: true, productId: 'product-b' });
  assert.deepEqual(selectSearchResult('3', ['product-a']), { matched: true, productId: null });
  assert.deepEqual(selectSearchResult('show cheaper', ['product-a']), { matched: false });
});

test('share URL uses configured public URL', () => {
  assert.equal(productShareUrl('https://metups.com/', 'product 1'), 'https://metups.com/product/product%201');
});
