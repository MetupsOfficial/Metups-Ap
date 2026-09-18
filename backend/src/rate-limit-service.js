const DEFAULT_MESSAGES_PER_MINUTE = 20;

export function resolveMessagesPerMinute(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MESSAGES_PER_MINUTE;
}

/** Atomically consumes one per-phone quota slot through the server-only RPC. */
export async function consumePhoneRateLimit(supabase, phone, options = {}) {
  const limit = resolveMessagesPerMinute(options.limit);
  const { data, error } = await supabase.rpc('consume_whatsapp_rate_limit', {
    p_phone: phone,
    p_limit: limit,
  });
  if (error) throw new Error(`Unable to apply WhatsApp rate limit: ${error.message}`);
  if (!data || typeof data.allowed !== 'boolean') throw new Error('WhatsApp rate limit returned invalid data');
  return data;
}
