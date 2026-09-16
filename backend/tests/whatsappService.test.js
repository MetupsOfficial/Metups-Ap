import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMessagePayload } from '../services/whatsappService.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

test('buildWhatsAppMessagePayload creates a valid Meta WhatsApp body', () => {
  const payload = buildWhatsAppMessagePayload('263713381193', 'Hello from Metups');

  assert.equal(payload.messaging_product, 'whatsapp');
  assert.equal(payload.to, '263713381193');
  assert.equal(payload.type, 'text');
  assert.equal(payload.text.body, 'Hello from Metups');
});

test('sendWhatsAppMessage retries one transient Meta failure', async () => {
  let calls = 0;
  const result = await sendWhatsAppMessage('263713381193', 'Hello', {
    WHATSAPP_TOKEN: 'test-token', WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
  }, {
    fetch: async () => {
      calls += 1;
      return new Response(calls === 1 ? 'temporary error' : '{}', { status: calls === 1 ? 500 : 200 });
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.ok, true);
});
