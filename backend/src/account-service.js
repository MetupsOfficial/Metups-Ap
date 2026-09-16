/** Canonicalize Meta's digits-only sender identifier to an E.164 phone value. */
export function toE164Phone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('Invalid WhatsApp phone number');
  return `+${digits}`;
}

/** Find the same profile whether the legacy website stored +263... or 263.... */
export async function findProfileByPhone(supabase, phone) {
  const raw = String(phone ?? '').replace(/\D/g, '');
  const e164 = toE164Phone(raw);
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,phone')
    .or(`phone.eq.${raw},phone.eq.${e164}`)
    .maybeSingle();
  if (error) throw new Error(`Unable to look up seller profile: ${error.message}`);
  return data ?? null;
}

/**
 * Sellers only: attach a WhatsApp phone to one canonical auth/profile UUID.
 * It never runs for anonymous product search sessions.
 */
export async function linkSellerAccount(supabase, phone, fullName) {
  const existing = await findProfileByPhone(supabase, phone);
  if (existing) return { profile: existing, created: false };

  const cleanName = String(fullName ?? '').trim();
  if (cleanName.length < 2) throw new Error('A seller name is required');
  const e164 = toE164Phone(phone);
  const { data, error } = await supabase.auth.admin.createUser({
    phone: e164,
    phone_confirm: true,
    user_metadata: { full_name: cleanName },
  });
  if (error || !data.user) throw new Error(`Unable to create seller account: ${error?.message ?? 'unknown error'}`);

  // The existing auth trigger creates profiles. Upsert makes the link reliable
  // in case the trigger was not installed when an older project was created.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: data.user.id, phone: e164, full_name: cleanName }, { onConflict: 'id' })
    .select('id,full_name,phone')
    .single();
  if (profileError) throw new Error(`Unable to link seller profile: ${profileError.message}`);
  return { profile, created: true };
}
