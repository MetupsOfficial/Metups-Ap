import test from 'node:test';
import assert from 'node:assert/strict';
import { formatResults } from '../utils/formatter.js';

test('formatResults includes a selection prompt for the next step', () => {
  const message = formatResults([
    { title: 'Samsung S21', price: 220, location: 'Harare' }
  ], { keywords: 'samsung s21' });

  assert.match(message, /Reply with 1/i);
});
