export function extractIncomingMessage(payload) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value || {};
  const message = value.messages?.[0];

  return {
    phone: message?.from || '',
    message: message?.text?.body || '',
    timestamp: message?.timestamp || 0,
  };
}
