import { logEvent } from '../utils/logger.js';

export async function publishListing(draft, env = {}) {
  if (!draft?.title || !draft?.price || !draft?.location || !draft?.condition || !draft?.description) {
    return { ok: false, error: 'Incomplete listing draft' };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { ok: false, error: 'Supabase configuration is missing' };
  }

  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        price: draft.price,
        location: draft.location,
        condition: draft.condition,
        sold: false,
        created_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase insert failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    logEvent('Listing published', { title: draft.title, id: data?.[0]?.id || null });
    return { ok: true, data };
  } catch (error) {
    logEvent('Listing publish failed', { error: error.message });
    return { ok: false, error: error.message };
  }
}
