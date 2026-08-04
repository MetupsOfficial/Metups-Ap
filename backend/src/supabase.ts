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

export function createMessageRepository(client: SupabaseClient) {
  return {
    async messageExists(messageId: string): Promise<boolean> {
      const { data, error } = await client.from('whatsappmessages').select('message_id').eq('message_id', messageId).maybeSingle();
      if (error) throw new Error('Unable to check message deduplication');
      return data !== null;
    },
    async insertMessage(message: { messageId: string; phone: string; timestamp: string; text: string; type: string }): Promise<void> {
      const { error } = await client.from('whatsappmessages').insert({
        message_id: message.messageId,
        phone: message.phone,
        message_timestamp: message.timestamp,
        text: message.text,
        type: message.type,
      });
      if (error) {
        // A unique-key collision after the pre-check is a concurrent duplicate.
        if (error.code === '23505') return;
        throw new Error('Unable to store normalized message');
      }
    },
    async ensureSession(phone: string): Promise<void> {
      const { error } = await client.from('whatsapp_sessions').upsert({ phone, stage: 'idle' }, { onConflict: 'phone', ignoreDuplicates: true });
      if (error) throw new Error('Unable to create session');
    },
  };
}
