import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMessagePayload } from '../services/whatsappService.js';

test('buildWhatsAppMessagePayload creates a valid Meta WhatsApp body', () => {
  const payload = buildWhatsAppMessagePayload('263713381193', 'Hello from Metups');

  assert.equal(payload.messaging_product, 'whatsapp');
  assert.equal(payload.to, '263713381193');
  assert.equal(payload.type, 'text');
  assert.equal(payload.text.body, 'Hello from Metups');
});
