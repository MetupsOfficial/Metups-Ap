import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(env: {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Supabase Worker secrets are not configured');
  }

  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}