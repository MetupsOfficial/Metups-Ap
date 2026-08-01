import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIncomingMessage } from '../services/messageService.js';

test('extractIncomingMessage pulls phone and text from a WhatsApp webhook payload', () => {
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '263713381193',
            timestamp: 1710000000,
            text: { body: 'Looking for a Samsung S21 under $250 in Harare' }
          }]
        }
      }]
    }]
  };

  const result = extractIncomingMessage(payload);

  assert.equal(result.phone, '263713381193');
  assert.equal(result.message, 'Looking for a Samsung S21 under $250 in Harare');
  assert.equal(result.timestamp, 1710000000);
});
