import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMetaWebhook, verifyMetaSignature } from '../src/message-intake.js';

const textPayload = {
  entry: [{ changes: [{ value: { messages: [{ id: 'wamid.text-1', from: '263771234567', timestamp: '1710000000', type: 'text', text: { body: 'Looking for a fridge' } }] } }] }],
};

test('normalizes a Meta text message', () => {
  assert.deepEqual(normalizeMetaWebhook(textPayload), [{
    messageId: 'wamid.text-1', phone: '263771234567', timestamp: '2024-03-09T16:00:00.000Z',
    text: 'Looking for a fridge', type: 'text',
  }]);
});

test('normalizes an image message and preserves its caption', () => {
  const payload = { entry: [{ changes: [{ value: { messages: [{ id: 'wamid.image-1', from: '263771234567', timestamp: '1710000001', type: 'image', image: { id: 'media-1', caption: 'Fridge photo' } }] } }] }] };
  assert.deepEqual(normalizeMetaWebhook(payload)[0], {
    messageId: 'wamid.image-1', phone: '263771234567', timestamp: '2024-03-09T16:00:01.000Z', text: 'Fridge photo', type: 'image',
  });
});

test('ignores Meta status updates', () => {
  const payload = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.text-1', status: 'delivered' }] } }] }] };
  assert.deepEqual(normalizeMetaWebhook(payload), []);
});

test('keeps a stable message ID for duplicate detection', () => {
  const firstDelivery = normalizeMetaWebhook(textPayload)[0];
  const repeatedDelivery = normalizeMetaWebhook(structuredClone(textPayload))[0];
  assert.equal(firstDelivery.messageId, repeatedDelivery.messageId);
});

test('validates the Meta X-Hub-Signature-256 header', async () => {
  const rawBody = JSON.stringify(textPayload);
  const secret = 'test-app-secret';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const header = `sha256=${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
  assert.equal(await verifyMetaSignature(rawBody, header, secret), true);
  assert.equal(await verifyMetaSignature(rawBody, header, 'wrong-secret'), false);
});
