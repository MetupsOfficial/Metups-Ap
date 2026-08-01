/**
 * ================================================================
 * METUPS MARKETPLACE — SUPABASE CLIENT
 * Authentication/supabase.js
 *
 * Single source-of-truth for the Supabase client instance.
 * Import { supabaseClient } wherever you need DB / Auth / Storage.
 *
 * HOW TO FIND YOUR CREDENTIALS
 * ─────────────────────────────
 * 1. Go to https://app.supabase.com
 * 2. Open your project → Settings → API
 * 3. Copy "Project URL"  →  paste as SUPABASE_URL below
 * 4. Copy "anon public"  →  paste as SUPABASE_ANON_KEY below
 * ================================================================
 */

// ── Public runtime configuration ─────────────────────────────────
// This file is intentionally excluded from version control. Browser-visible
// values are not secrets; protect data access with Supabase RLS policies.
const publicConfig = globalThis.METUPS_PUBLIC_CONFIG;
if (!publicConfig?.SUPABASE_URL || !publicConfig?.SUPABASE_ANON_KEY) {
  throw new Error('Missing public runtime configuration. Create assets/js/runtime-config.js from runtime-config.example.js.');
}
const { SUPABASE_URL, SUPABASE_ANON_KEY } = publicConfig;

// ── Guard: the Supabase CDN script must be loaded before this module ──
// Note: Load /assets/js/runtime-config.js and /assets/js/supabase.min.js
// before importing this module, instead of using a remote CDN.
const supabaseLib = window.supabase;
if (!supabaseLib) {
  alert('[Metups] Supabase local library not found. Please ensure /assets/js/supabase.min.js is loaded locally, not from a CDN.');
  throw new Error('Supabase local library not found.');
}

// ── Create the singleton client ───────────────────────────────────
export const supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    /**
     * persistSession: true  → stores the JWT in localStorage so the user
     * stays logged in across page reloads and browser restarts.
     */
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// ── Named exports for convenience ────────────────────────────────
export { SUPABASE_URL, SUPABASE_ANON_KEY };

/**
 * testConnection()
 * Quick sanity-check you can run from the browser console:
 *
 *   import { testConnection } from './supabase.js';
 *   testConnection().then(console.log);
 */
export async function testConnection() {
  try {
    const { count, error } = await supabaseClient
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ DB connection failed:', error.message);
      return { ok: false, error: error.message };
    }

    //console.log(`✅ Connected — ${count} products in DB`);
    return { ok: true, count };
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return { ok: false, error: err.message };
  }
}
