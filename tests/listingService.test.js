import test from 'node:test';
import assert from 'node:assert/strict';
import { publishListing } from '../services/listingService.js';

test('publishListing rejects incomplete drafts', async () => {
  const result = await publishListing({ title: 'Laptop' });

  assert.equal(result.ok, false);
  assert.match(result.error, /Incomplete listing draft/i);
});
