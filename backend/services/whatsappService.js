import { logEvent } from '../utils/logger.js';
import { buildCarouselPayload, buildSingleListingPayload, contactLink } from '../utils/formatter.js';

export function buildWhatsAppMessagePayload(to, text) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };
}

export async function sendWhatsAppMessage(to, text, env = {}, dependencies = {}) {
  if (!to || !text) throw new Error('Recipient and message body are required');
  return sendPayload(to, buildWhatsAppMessagePayload(to, text), env, dependencies);
}

/** Send one rich search result message, with progressively simpler fallbacks. */
export async function sendResults(env, to, listings, dependencies = {}) {
  if (!Array.isArray(listings) || listings.length === 0) return { ok: true, skipped: true };
  const limited = listings.slice(0, 3);
  try {
    const richPayload = limited.length === 1
      ? buildSingleListingPayload(to, limited[0])
      : buildCarouselPayload(to, limited, env.PLACEHOLDER_IMAGE_URL);
    return await sendPayload(to, richPayload, env, dependencies);
  } catch (richError) {
    logEvent('Rich WhatsApp results failed; falling back', {
      request_id: richError.requestId ?? null,
      error_body: richError.body ?? richError.message,
    });
  }

  try {
    const sent = [];
    for (const listing of limited) {
      sent.push(await sendPayload(to, buildSingleListingPayload(to, { ...listing, image_url: null }), env, dependencies));
    }
    return { ok: true, fallback: 'single_without_image', sent };
  } catch (fallbackError) {
    logEvent('WhatsApp result fallback failed; sending plain text', {
      request_id: fallbackError.requestId ?? null,
      error_body: fallbackError.body ?? fallbackError.message,
    });
    const lines = limited.map(listing => {
      const price = listing.price != null ? `$${listing.price}` : 'Price not listed';
      return `${listing.title || 'Untitled listing'} — ${price}\n${contactLink(listing)}`;
    });
    return sendWhatsAppMessage(to, lines.join('\n\n'), env, dependencies);
  }
}

async function sendPayload(to, payload, env, dependencies) {
  const token = env.WA_TOKEN ?? env.WHATSAPP_TOKEN;
  const phoneNumberId = env.WA_PHONE_NUMBER_ID ?? env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { ok: true, mock: true, payload };

  const version = env.WA_API_VERSION || 'v22.0';
  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  logEvent('Sending WhatsApp reply', { to, type: payload.type, preview: payload.text?.body?.slice(0, 80) ?? null });

  const fetchImpl = dependencies.fetch ?? fetch;
  let response = await sendOnce(fetchImpl, url, headers, payload);
  if (response.status >= 500 && response.status <= 599) {
    response = await sendOnce(fetchImpl, url, headers, payload);
  }
  if (!response.ok) {
    const body = redactToken(await response.text(), token);
    const error = new Error(`WhatsApp send failed: ${response.status} ${body}`);
    error.body = body;
    error.requestId = response.headers.get('x-fb-request-id') || response.headers.get('x-business-use-case-usage-request-id') || null;
    error.status = response.status;
    throw error;
  }
  return { ok: true, payload };
}

function redactToken(body, token) {
  return token ? body.split(token).join('[REDACTED]') : body;
}

function sendOnce(fetchImpl, url, headers, payload) {
  return fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(payload) });
}
