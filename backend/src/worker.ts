import { normalizeMetaWebhook, persistNormalizedMessage, verifyMetaSignature } from './message-intake.js';
import { createMessageRepository, createSupabaseClient } from './supabase';

export interface Env {
  ENVIRONMENT?: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
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

    const repository = createMessageRepository(createSupabaseClient(env));
    let processed = 0;
    let duplicates = 0;
    for (const message of messages) {
      log({ timestamp: new Date().toISOString(), correlationId, route: url.pathname, status: 200,
        event: 'message.normalized', message });
      const result = await persistNormalizedMessage(message, repository);
      if (result.duplicate) {
        duplicates += 1;
        continue;
      }
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
