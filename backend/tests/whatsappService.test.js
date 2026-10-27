import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMessagePayload } from '../services/whatsappService.js';
import { sendResults, sendWhatsAppMessage } from '../services/whatsappService.js';

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

test('sendResults sends one interactive payload and caps the result count at three', async () => {
  const listing = { title: 'Phone', price: 100, seller_phone: '0784617009', image_url: 'https://cdn.metups.com/phone.jpg' };
  const result = await sendResults({}, '263700000000', [listing, listing, listing, listing]);
  assert.equal(result.payload.interactive.type, 'carousel');
  assert.equal(result.payload.interactive.action.cards.length, 3);
});

test('sendResults falls back from a failed carousel to image-free single cards', async () => {
  const calls = [];
  const listings = [1, 2].map(n => ({ title: `Phone ${n}`, price: 100, seller_phone: '0784617009', image_url: `https://cdn.metups.com/${n}.jpg` }));
  const result = await sendResults({ WA_TOKEN: 'token', WA_PHONE_NUMBER_ID: 'number', PLACEHOLDER_IMAGE_URL: 'https://cdn.metups.com/placeholder.jpg' }, '263700000000', listings, {
    fetch: async (_url, options) => {
      const callNumber = calls.length + 1;
      calls.push(JSON.parse(options.body));

      // Fail the carousel and image-free card.
      // Allow the final plain-text fallback to succeed.
      if (callNumber < 3) {
        return new Response(
          '{"error":{"message":"failed"}}',
          { status: 400 },
        );
      }

      return new Response('{}', { status: 200 });
    },
  });
  assert.equal(result.fallback, 'single_without_image');
  assert.equal(calls[0].interactive.type, 'carousel');
  assert.equal(calls[1].interactive.type, 'cta_url');
  assert.equal('header' in calls[1].interactive, false);
  assert.equal(calls[2].interactive.type, 'cta_url');
});

test('sendResults falls back to one text message if image-free single sends fail', async () => {
  const calls = [];
  const listing = { title: 'Phone', price: 100, seller_phone: '0784617009' };
  await sendResults({ WA_TOKEN: 'token', WA_PHONE_NUMBER_ID: 'number', PLACEHOLDER_IMAGE_URL: 'https://cdn.metups.com/placeholder.jpg' }, '263700000000', [listing, listing], {
    fetch: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return new Response('{"error":{"message":"failed"}}', { status: 400 });
    },
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].type, 'text');
  assert.match(calls[2].text.body, /https:\/\/wa\.me\/263784617009/);
});
