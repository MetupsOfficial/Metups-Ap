import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSearchDraft,
  getSearchDraft,
  nextSearchClarification,
  resolveSearchDraftAnswer,
} from '../src/buyer-conversation-service.js';

test('buyer search clarification asks for product then location, without requiring a budget', () => {
  assert.deepEqual(nextSearchClarification({ category: null, budgetMax: null, location: null, condition: null }), {
    pendingQuestion: 'category',
  });
  assert.deepEqual(nextSearchClarification({ category: 'fridge', budgetMax: null, location: null, condition: null }), {
    pendingQuestion: 'location',
  });
  assert.equal(nextSearchClarification({ category: 'fridge', budgetMax: null, location: 'harare', condition: null }), null);
});

test('a compact draft accepts a natural town and optional budget without AI', () => {
  const draft = buildSearchDraft({ category: 'fridge', budgetMax: null, location: null, condition: null }, 'location');
  assert.deepEqual(getSearchDraft({ searchDraft: draft }), draft);
  assert.deepEqual(resolveSearchDraftAnswer(draft, 'Harare under $100'), {
    criteria: { category: 'fridge', budgetMax: 100, location: 'harare', condition: null },
    clarification: null,
  });
});

test('a draft does not mistake control messages for marketplace filters', () => {
  const draft = buildSearchDraft({ category: 'fridge', budgetMax: null, location: null, condition: null }, 'location');
  assert.equal(resolveSearchDraftAnswer(draft, 'cancel'), null);
  assert.equal(resolveSearchDraftAnswer(draft, 'show more'), null);
});
