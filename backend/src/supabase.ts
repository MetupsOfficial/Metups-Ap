import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './worker';

/** Creates a server-only client from Cloudflare Worker secrets. */
export function createSupabaseClient(env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Worker secrets are not configured');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
