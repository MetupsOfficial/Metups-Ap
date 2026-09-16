import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceSellerDraft, startSellerDraft } from '../src/seller-flow.js';

test('seller listing flow accepts only the website category and condition choices', () => {
  let step = startSellerDraft();
  step = advanceSellerDraft(step.draft, step.stage, { type: 'text', text: 'iPhone 13', content: {} });
  step = advanceSellerDraft(step.draft, step.stage, { type: 'text', text: '1', content: {} });
  step = advanceSellerDraft(step.draft, step.stage, { type: 'image', text: '', content: { mediaId: 'media-1' } });
  step = advanceSellerDraft(step.draft, step.stage, { type: 'text', text: 'DONE', content: {} });
  step = advanceSellerDraft(step.draft, step.stage, { type: 'text', text: '2', content: {} });

  assert.equal(step.draft.category, 'Electronics');
  assert.equal(step.draft.condition, 'Like-New');
  assert.equal(step.stage, 'awaiting_price');
});

test('seller draft requires at least one image before moving on', () => {
  const draft = { title: 'Chair', category: 'Furniture', mediaIds: [], condition: '', price: null, location: '', description: '' };
  const step = advanceSellerDraft(draft, 'awaiting_images', { type: 'text', text: 'DONE', content: {} });
  assert.equal(step.stage, 'awaiting_images');
  assert.match(step.reply, /at least one photo/i);
});

test('seller draft ends at account linking instead of publishing without a profile UUID', () => {
  const draft = { title: 'Chair', category: 'Furniture', mediaIds: ['media-1'], condition: 'Fair', price: 30, location: 'Harare', description: '' };
  const step = advanceSellerDraft(draft, 'awaiting_confirmation', { type: 'text', text: 'YES', content: {} });
  assert.equal(step.stage, 'awaiting_account_link');
  assert.match(step.reply, /link/i);
});
