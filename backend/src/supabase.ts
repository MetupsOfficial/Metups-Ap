import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(env: any) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase Worker secrets are not configured');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
