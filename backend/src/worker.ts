import { normalizeMetaWebhook, verifyMetaSignature } from './message-intake.js';
import { createSupabaseClient } from './supabase';

export interface Env {
  ENVIRONMENT?: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  WHATSAPP_VERIFY_TOKEN: string;
  META_APP_SECRET: string;
}

interface LogFields {
  timestamp: string;
  correlationId: string;
  route: string;
  status: number;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const correlationId = crypto.randomUUID();
    const url = new URL(request.url);
    let response: Response;

    try {
      response = await routeRequest(request, env, url, correlationId);
    } catch (error) {
      log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: 500,
        error: error instanceof Error ? error.message : 'Unknown error' });
      return json({ error: 'Internal server error', correlationId }, 500, correlationId);
    }

    log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: response.status });
    return withCorrelationId(response, correlationId);
  },
};

async function routeRequest(request: Request, env: Env, url: URL, correlationId: string): Promise<Response> {
  if (url.pathname === '/health' && request.method === 'GET') {
    return json({ status: 'ok', timestamp: new Date().toISOString(), environment: env.ENVIRONMENT ?? 'development' });
  }

  if (url.pathname === '/webhook' && request.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const verifyToken = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && verifyToken === env.WHATSAPP_VERIFY_TOKEN && challenge !== null) {
      return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    return json({ error: 'Verification failed' }, 403);
  }

  if (url.pathname === '/webhook' && request.method === 'POST') {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    if (!await verifyMetaSignature(rawBody, signature, env.META_APP_SECRET)) {
      return json({ error: 'Unauthorized' }, 401);
    }
    

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const messages = normalizeMetaWebhook(payload);
    if (messages.length === 0) return json({ status: 'ignored' }, 200);

    const supabase = createSupabaseClient(env);
    let processed = 0;
    let duplicates = 0;
    for (const message of messages) {
      log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: 200,
        event: 'message.normalized', message });
      const { data: existingMessage, error: lookupError } = await supabase
        .from('whatsappmessages')
        .select('message_id')
        .eq('message_id', message.messageId)
        .maybeSingle();
      if (lookupError) throw new Error('Unable to check message deduplication');
      if (existingMessage) {
        duplicates += 1;
        continue;
      }

      const { error: insertError } = await supabase.from('whatsappmessages').insert({
        message_id: message.messageId,
        phone: message.phone,
        message_timestamp: message.timestamp,
        text: message.text,
        type: message.type,
      });
      if (insertError) {
        if (insertError.code === '23505') {
          duplicates += 1;
          continue;
        }
        throw new Error('Unable to store normalized message');
      }

      const { error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .upsert({ phone: message.phone, stage: 'idle' }, { onConflict: 'phone', ignoreDuplicates: true });
      if (sessionError) throw new Error('Unable to create session');
      processed += 1;
    }
    return json({ status: 'accepted', processed, duplicates }, 200);
  }

  return json({ error: 'Not found' }, 404);
}

function json(body: unknown, status = 200, correlationId?: string): Response {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  if (correlationId) headers.set('x-correlation-id', correlationId);
  return new Response(JSON.stringify(body), { status, headers });
}

function withCorrelationId(response: Response, correlationId: string): Response {
  const headers = new Headers(response.headers);
  headers.set('x-correlation-id', correlationId);
  return new Response(response.body, { status: response.status, headers });
}

function log(fields: LogFields & Record<string, unknown>): void {
  console.log(JSON.stringify(fields));
}
