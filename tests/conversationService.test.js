import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSelection } from '../services/conversationService.js';

test('handleSelection returns a prompt for a valid selection', () => {
  const response = handleSelection('1', [{ title: 'Samsung S21' }]);

  assert.match(response, /Great choice/i);
});
