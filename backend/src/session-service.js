export const IDLE_INTENT = 'idle';
export const DEFAULT_SESSION_TTL_MINUTES = 30;

export function resolveSessionTtlMinutes(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_MINUTES;
}

export function isSessionExpired(session, now = new Date()) {
  if (!session?.expires_at) return true;
  const expiresAt = new Date(session.expires_at);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
}

export function buildSessionActivity(now = new Date(), ttlMinutes = DEFAULT_SESSION_TTL_MINUTES) {
  const lastMessageAt = new Date(now);
  const expiresAt = new Date(lastMessageAt.getTime() + ttlMinutes * 60_000);
  return { last_message_at: lastMessageAt.toISOString(), expires_at: expiresAt.toISOString() };
}

export function buildNewSession(phone, now, ttlMinutes) {
  return {
    phone,
    stage: IDLE_INTENT, // retained temporarily for the pre-Stage-2 schema consumer
    current_intent: IDLE_INTENT,
    current_stage: null,
    context: {},
    ...buildSessionActivity(now, ttlMinutes),
  };
}

export function buildExpiredSessionReset(now, ttlMinutes) {
  return {
    stage: IDLE_INTENT,
    current_intent: IDLE_INTENT,
    current_stage: null,
    context: {},
    ...buildSessionActivity(now, ttlMinutes),
  };
}

/**
 * Reads or creates a phone's session and extends its rolling expiry.
 * This module is the sole owner of writes to whatsapp_sessions.
 */
export async function loadSession(supabase, phone, options = {}) {
  if (!phone) throw new Error('A phone number is required to load a session');

  const now = options.now ? new Date(options.now) : new Date();
  const ttlMinutes = resolveSessionTtlMinutes(options.ttlMinutes);
  const { data: existing, error: readError } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (readError) throw new Error('Unable to read conversation session');

  if (!existing) {
    return insertSession(supabase, buildNewSession(phone, now, ttlMinutes), options);
  }

  const update = isSessionExpired(existing, now)
    ? buildExpiredSessionReset(now, ttlMinutes)
    : buildSessionActivity(now, ttlMinutes);
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .update(update)
    .eq('phone', phone)
    .select()
    .single();
  if (error) throw new Error('Unable to update conversation session');

  return { session: data, created: false, reset: isSessionExpired(existing, now) };
}

/** Persist future Stage 3–7 state transitions through this one write path. */
export async function saveSessionState(supabase, phone, state, options = {}) {
  if (!phone) throw new Error('A phone number is required to save a session');
  const now = options.now ? new Date(options.now) : new Date();
  const ttlMinutes = resolveSessionTtlMinutes(options.ttlMinutes);
  const update = {
    current_intent: state.currentIntent ?? IDLE_INTENT,
    current_stage: state.currentStage ?? null,
    context: state.context ?? {},
    ...buildSessionActivity(now, ttlMinutes),
  };
  if (state.profileId !== undefined) update.profile_id = state.profileId;

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .update(update)
    .eq('phone', phone)
    .select()
    .single();
  if (error) throw new Error('Unable to save conversation session');
  return data;
}

async function insertSession(supabase, session, options) {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .insert(session)
    .select()
    .single();
  if (!error) return { session: data, created: true, reset: false };

  // A concurrent message from the same phone may have won the unique insert.
  if (error.code === '23505') return loadSession(supabase, session.phone, options);
  throw new Error('Unable to create conversation session');
}
