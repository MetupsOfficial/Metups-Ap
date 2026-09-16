import { logEvent } from '../utils/logger.js';

export function buildWhatsAppMessagePayload(to, text) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };
}

export async function sendWhatsAppMessage(to, text, env = {}, dependencies = {}) {
  if (!to || !text) {
    throw new Error('Recipient and message body are required');
  }

  const payload = buildWhatsAppMessagePayload(to, text);
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { ok: true, mock: true, payload };
  }

  const url = `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const headers = { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' };
  logEvent('Sending WhatsApp reply', { to, preview: text.slice(0, 80) });

  const fetchImpl = dependencies.fetch ?? fetch;
  const response = await sendOnce(fetchImpl, url, headers, payload);
  // Retry only transient Meta failures once; malformed credentials and payloads
  // must surface immediately instead of creating repeated invalid requests.
  const finalResponse = response.status >= 500 && response.status <= 599
    ? await sendOnce(fetchImpl, url, headers, payload)
    : response;
  if (!finalResponse.ok) {
    const errorText = await finalResponse.text();
    throw new Error(`WhatsApp send failed: ${finalResponse.status} ${errorText}`);
  }

  return { ok: true, payload };
}

function sendOnce(fetchImpl, url, headers, payload) {
  return fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(payload) });
}
