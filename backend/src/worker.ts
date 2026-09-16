import { normalizeMetaWebhook, verifyMetaSignature } from './message-intake.js';
import { createSupabaseClient } from './supabase';
import { loadSession, saveSessionState } from './session-service.js';
import { configureAI } from './ai/router';
import { processConversation, unknownConversationResult } from './ai/tasks/conversation';
import { buildSearchCriteria, searchProducts } from './search-service.js';
import { isSearchRefinementRequest, refineSearchCriteria } from './search-refinement-service.js';
import { rankProducts } from './ranking-service.js';
import { formatResults } from '../utils/formatter.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { advanceSellerDraft, startSellerDraft } from './seller-flow.js';
import { findProfileByPhone, linkSellerAccount } from './account-service.js';
import { publishWhatsappListing } from './listing-service.js';

export interface Env {
  ENVIRONMENT?: 'development' | 'production';
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  WHATSAPP_VERIFY_TOKEN: string;
  META_APP_SECRET: string;
  SESSION_TTL_MINUTES?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_TIMEOUT_MS?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_GRAPH_API_VERSION?: string;
  SEARCH_REFINEMENT_CHEAPER_FACTOR?: string;
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
  configureAI({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
  });
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
      throw new Error(`Unable to store normalized message: ${insertError.message}`);
    }

    const sessionResult = await loadSession(supabase, message.phone, {
      ttlMinutes: env.SESSION_TTL_MINUTES,
    });
    const activeDraft = sessionResult.session.context?.draftListing;
    const hasSellerDraft = sessionResult.session.current_intent === 'sell_product'
      && activeDraft && sessionResult.session.current_stage;
    let intent = unknownConversationResult();
    let sellerStep = null;
    if (hasSellerDraft) {
      if (/^cancel$/i.test(message.text.trim())) {
        intent = { ...intent, intent: 'idle', confidence: 1, provider: 'session' };
        sellerStep = { draft: null, stage: null, reply: 'Your listing draft has been discarded.', cancelled: true };
      } else {
        sellerStep = advanceSellerDraft(activeDraft, sessionResult.session.current_stage, message);
        intent = { ...intent, intent: 'sell_product', confidence: 1, provider: 'session' };
      }
    } else {
      try {
        intent = await processConversation({
          message: message.text,
          context: {
            currentIntent: sessionResult.session.current_intent,
            currentStage: sessionResult.session.current_stage,
            extractedFilters: sessionResult.session.context,
          },
        });
      } catch (error) {
        log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 500,
          event: 'intent.classification_failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    let sessionState = {
      currentIntent: intent.intent,
      currentStage: sessionResult.session.current_stage,
      context: sessionResult.session.context,
    };
    let reply: string | null = null;
    let replyType: string | null = null;

    // A known seller can publish immediately. A seller who has never linked a
    // Metups account takes the existing account-link step first.
    const wantsToPublish = hasSellerDraft
      && sessionResult.session.current_stage === 'awaiting_confirmation'
      && /^yes$/i.test(message.text.trim());
    if (wantsToPublish) {
      const profile = sessionResult.session.profile_id
        ? { id: sessionResult.session.profile_id }
        : await findProfileByPhone(supabase, message.phone);
      if (profile) {
        try {
          const published = await publishWhatsappListing(supabase, activeDraft, profile.id, env);
          const { draftListing: _draftListing, ...context } = sessionResult.session.context;
          reply = '✅ Your listing is live on Metups. Buyers can now find it.';
          replyType = 'listing_published';
          sessionState = { currentIntent: 'idle', currentStage: null, context, profileId: profile.id };
          sellerStep = { published: true };
          await writeEvent(supabase, {
            request_id: requestId,
            phone: message.phone,
            event_type: 'listing_published',
            payload: { message_id: message.messageId, product_id: published.productId, image_count: published.imagePaths.length },
            duration_ms: Date.now() - startedAt,
          });
        } catch (error) {
          reply = 'I could not publish that listing yet. Your draft is still saved; reply YES to try again or CHANGE to edit it.';
          replyType = 'listing_publish_error';
          sellerStep = { publishFailed: true };
          log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 500,
            event: 'listing.publish_failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    if (hasSellerDraft && sessionResult.session.current_stage === 'awaiting_account_link') {
      try {
        const linked = await linkSellerAccount(supabase, message.phone, message.text);
        reply = linked.created
          ? `Thanks ${linked.profile.full_name}! Your Metups seller account is linked. Reply YES to publish your listing.`
          : 'Your existing Metups account is linked. Reply YES to publish your listing.';
        replyType = 'account_linked';
        sessionState = {
          currentIntent: 'sell_product',
          currentStage: 'awaiting_confirmation',
          context: sessionResult.session.context,
          profileId: linked.profile.id,
        };
        sellerStep = { accountLinked: true };
      } catch (error) {
        reply = 'I could not link your seller account yet. Please send the name buyers should see.';
        replyType = 'account_link_error';
        log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 500,
          event: 'account.link_failed', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    if (sellerStep?.cancelled) {
      reply = sellerStep.reply;
      replyType = 'seller_listing_cancelled';
      const { draftListing: _draftListing, ...context } = sessionResult.session.context;
      sessionState = { currentIntent: 'idle', currentStage: null, context };
    } else if (sellerStep?.accountLinked) {
      // Account service already prepared the session state and reply above.
    } else if (sellerStep?.published || sellerStep?.publishFailed) {
      // Publication already set a terminal or retryable session state above.
    } else if (intent.intent === 'sell_product') {
      sellerStep ??= startSellerDraft();
      reply = sellerStep.reply;
      replyType = 'seller_listing';
      sessionState = {
        currentIntent: 'sell_product',
        currentStage: sellerStep.stage,
        context: { ...sessionResult.session.context, draftListing: sellerStep.draft },
      };
    }

    const previousSearch = sessionResult.session.context?.search;
    const isSearchRefinement = !hasSellerDraft && previousSearch?.criteria
      && (intent.intent === 'continue_conversation' || isSearchRefinementRequest(message.text));
    if (isSearchRefinement) {
      const criteria = refineSearchCriteria(previousSearch.criteria, intent.extracted, message.text, {
        cheaperFactor: env.SEARCH_REFINEMENT_CHEAPER_FACTOR,
      });
      if (criteria) {
        const candidates = await searchProducts(supabase, criteria);
        const results = rankProducts(candidates, criteria);
        reply = formatResults(results, criteria);
        replyType = 'search_refinement';
        sessionState = {
          currentIntent: 'search_product',
          currentStage: 'search_ready',
          context: { ...sessionResult.session.context, search: { criteria, resultIds: results.map(result => result.id) } },
        };
        await writeEvent(supabase, {
          request_id: requestId,
          phone: message.phone,
          event_type: 'search_run',
          payload: { message_id: message.messageId, criteria, candidate_count: candidates.length, result_count: results.length, refined: true },
          duration_ms: Date.now() - startedAt,
        });
      }
    } else if (intent.intent === 'search_product') {
      const criteria = buildSearchCriteria(intent.extracted);
      const candidates = await searchProducts(supabase, criteria);
      const results = rankProducts(candidates, criteria);
      reply = formatResults(results, criteria);
      replyType = 'search_results';
      sessionState = {
        currentIntent: 'search_product',
        currentStage: 'search_ready',
        context: {
          ...sessionResult.session.context,
          search: { criteria, resultIds: results.map(result => result.id) },
        },
      };
      await writeEvent(supabase, {
        request_id: requestId,
        phone: message.phone,
        event_type: 'search_run',
        payload: { message_id: message.messageId, criteria, candidate_count: candidates.length, result_count: results.length },
        duration_ms: Date.now() - startedAt,
      });
      log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
        event: 'search.completed', messageId: message.messageId, candidates: candidates.length, results: results.length });
    }

    const updatedSession = await saveSessionState(supabase, message.phone, sessionState, {
      ttlMinutes: env.SESSION_TTL_MINUTES,
    });

    await writeEvent(supabase, {
      request_id: requestId,
      phone: message.phone,
      event_type: 'message_received',
      payload: { message_id: message.messageId, type: message.type },
      duration_ms: Date.now() - startedAt,
    });
    if (reply) {
      await sendWhatsAppMessage(message.phone, reply, env);
      await writeEvent(supabase, {
        request_id: requestId,
        phone: message.phone,
        event_type: 'reply_sent',
        payload: { message_id: message.messageId, reply_type: replyType },
        duration_ms: Date.now() - startedAt,
      });
    }
    await writeEvent(supabase, {
      request_id: requestId,
      phone: message.phone,
      event_type: 'intent_classified',
      payload: { message_id: message.messageId, intent: intent.intent, confidence: intent.confidence, provider: intent.provider },
      duration_ms: Date.now() - startedAt,
    });
    processed += 1;
    log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
      event: 'message.session_attached', messageId: message.messageId, phone: message.phone, type: message.type,
      sessionId: updatedSession.id, sessionCreated: sessionResult.created, sessionReset: sessionResult.reset,
      intent: intent.intent, confidence: intent.confidence });
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
