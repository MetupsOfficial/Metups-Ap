import { config } from '../config/supabase.js';
import { logEvent } from '../utils/logger.js';

export function buildWhatsAppMessagePayload(to, text) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };
}

export async function sendWhatsAppMessage(to, text) {
  if (!to || !text) {
    throw new Error('Recipient and message body are required');
  }

  const payload = buildWhatsAppMessagePayload(to, text);
  const url = `https://graph.facebook.com/v22.0/${config.whatsappPhoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${config.whatsappToken}`,
    'Content-Type': 'application/json',
  };

  logEvent('Sending WhatsApp reply', { to, preview: text.slice(0, 80) });

  if (!config.whatsappToken || !config.whatsappPhoneNumberId) {
    return { ok: true, mock: true, payload };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${errorText}`);
  }

  return { ok: true, payload };
}
