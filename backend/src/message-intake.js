const META_SIGNATURE_PREFIX = 'sha256=';

/** Validate Meta's HMAC-SHA256 header against the exact, unparsed request body. */
export async function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader?.startsWith(META_SIGNATURE_PREFIX)) return false;

  const expected = signatureHeader.slice(META_SIGNATURE_PREFIX.length).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const actual = bytesToHex(new Uint8Array(signature));
  return timingSafeEqual(actual, expected);
}

/** Return only inbound WhatsApp messages. Status and other webhook events yield an empty array. */
export function normalizeMetaWebhook(payload) {
  const normalized = [];
  for (const entry of asArray(payload?.entry)) {
    for (const change of asArray(entry?.changes)) {
      for (const message of asArray(change?.value?.messages)) {
        const item = normalizeMessage(message);
        if (item) normalized.push(item);
      }
    }
  }
  return normalized;
}

export function normalizeMessage(message) {
  if (!message?.id || !message?.from) return null;

  const type = message.type === 'text' ? 'text' : message.type === 'image' ? 'image' : 'unknown';
  const unixTimestamp = Number(message.timestamp);
  const timestamp = Number.isFinite(unixTimestamp)
    ? new Date(unixTimestamp * 1000).toISOString()
    : new Date().toISOString();

  return {
    messageId: message.id,
    phone: message.from,
    timestamp,
    text: type === 'text' ? (message.text?.body ?? '') : type === 'image' ? (message.image?.caption ?? '') : '',
    type,
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}
