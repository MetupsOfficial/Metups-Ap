import { config } from '../config/supabase.js';
import { logEvent } from '../utils/logger.js';

export async function publishListing(draft) {
  if (!draft?.title || !draft?.price || !draft?.location || !draft?.condition || !draft?.description) {
    return { ok: false, error: 'Incomplete listing draft' };
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { ok: false, error: 'Supabase configuration is missing' };
  }

  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/products`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
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
