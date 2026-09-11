import { normalizeMetaWebhook, verifyMetaSignature } from './message-intake.js';
import { createSupabaseClient } from './supabase';
import { loadSession } from './session-service.js';

export interface Env {
  ENVIRONMENT?: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  WHATSAPP_VERIFY_TOKEN: string;
  META_APP_SECRET: string;
  SESSION_TTL_MINUTES?: string;
}

interface LogFields {
  timestamp: string;
  correlationId: string;
  route: string;
  status: number;
  error?: string;
}

/** The subset of Cloudflare's request context used by this Worker. */
interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerExecutionContext): Promise<Response> {
    const correlationId = crypto.randomUUID();
    const url = new URL(request.url);
    let response: Response;

    try {
      response = await routeRequest(request, env, url, correlationId, ctx);
    } catch (error) {
      log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: 500,
        error: error instanceof Error ? error.message : 'Unknown error' });
      return json({ error: 'Internal server error', correlationId }, 500, correlationId);
    }

    log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: response.status });
    return withCorrelationId(response, correlationId);
  },
};

async function routeRequest(
  request: Request,
  env: Env,
  url: URL,
  correlationId: string,
  ctx: WorkerExecutionContext,
): Promise<Response> {
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
      return json({ error: 'Forbidden' }, 403);
    }
    

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const messages = normalizeMetaWebhook(payload);
    if (messages.length === 0) {
      log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: 200, event: 'webhook.ignored' });
      return json({ status: 'ignored' }, 200, correlationId);
    }

    // Meta retries slow webhooks. Acknowledge now; durable message-id uniqueness keeps retries safe.
    ctx.waitUntil(processInboundMessages(messages, env, correlationId).catch(error => {
      log({ timestamp: new Date().toISOString(), correlationId, route: '/webhook', status: 500,
        event: 'intake.failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }));
    return json({ status: 'accepted', received: messages.length }, 200, correlationId);
  }

  return json({ error: 'Not found' }, 404);
}

async function processInboundMessages(
  messages: ReturnType<typeof normalizeMetaWebhook>,
  env: Env,
  requestId: string,
): Promise<void> {
  const startedAt = Date.now();
  const supabase = createSupabaseClient(env);
  let processed = 0;
  let duplicates = 0;

  for (const message of messages) {
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
      request_id: requestId,
      phone: message.phone,
      message_timestamp: message.timestamp,
      text: message.text,
      type: message.type,
      content: message.content,
    });
    if (insertError) {
      if (insertError.code === '23505') {
        duplicates += 1;
        continue;
      }
      throw new Error('Unable to store normalized message');
    }

    const sessionResult = await loadSession(supabase, message.phone, {
      ttlMinutes: env.SESSION_TTL_MINUTES,
    });

    await writeEvent(supabase, {
      request_id: requestId,
      phone: message.phone,
      event_type: 'message_received',
      payload: { message_id: message.messageId, type: message.type },
      duration_ms: Date.now() - startedAt,
    });
    processed += 1;
    log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
      event: 'message.session_attached', messageId: message.messageId, phone: message.phone, type: message.type,
      sessionId: sessionResult.session.id, sessionCreated: sessionResult.created, sessionReset: sessionResult.reset });
  }

  log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
    event: 'intake.complete', processed, duplicates, durationMs: Date.now() - startedAt });
}

async function writeEvent(supabase: ReturnType<typeof createSupabaseClient>, event: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.from('whatsapp_events').insert(event);
    if (!error) return;
    // Observability must not turn an accepted inbound message into a failed webhook.
    log({ timestamp: new Date().toISOString(), correlationId: String(event.request_id), route: '/webhook', status: 500,
      event: 'event_log.failed', error: error.message });
  } catch (error) {
    log({ timestamp: new Date().toISOString(), correlationId: String(event.request_id), route: '/webhook', status: 500,
      event: 'event_log.failed', error: error instanceof Error ? error.message : 'Unknown error' });
  }
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
