import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftListing, handleSellerMessage } from '../services/sellerService.js';

test('createDraftListing starts a new seller flow', () => {
  const draft = createDraftListing();

  assert.equal(draft.step, 'title');
});

test('handleSellerMessage advances the seller flow step by step', () => {
  const first = handleSellerMessage('sell', null);
  const second = handleSellerMessage('Laptop', first.draft);
  const third = handleSellerMessage('350', second.draft);

  assert.match(first.response, /What are you selling/i);
  assert.match(second.response, /What price/i);
  assert.equal(third.draft.step, 'location');
});
