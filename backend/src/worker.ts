import { normalizeMetaWebhook, verifyMetaSignature } from './message-intake.js';
import { createSupabaseClient } from './supabase';
import { loadSession, saveSessionState } from './session-service.js';
import { configureAI } from './ai/router';
import { processConversation, unknownConversationResult } from './ai/tasks/conversation';
import { classifyFastIntent } from './fast-intent-service';
import { buildSearchCriteria, searchProducts } from './search-service.js';
import { isSearchRefinementRequest, refineSearchCriteria } from './search-refinement-service.js';
import { rankProducts } from './ranking-service.js';
import { formatGreeting, formatHelp, formatInvalidSelection, formatResults, formatSearchCancelled, formatSelectedProduct, formatSellerWebsiteRedirect, formatUnknownRequest } from '../utils/formatter.js';
import { sendResults, sendWhatsAppMessage } from '../services/whatsappService.js';
import { clearBuyerSearchContext, productShareUrl, selectSearchResult, sellerWhatsAppUrl } from './buyer-selection-service.js';
import { consumePhoneRateLimit } from './rate-limit-service.js';

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
  WA_API_VERSION?: string;
  WA_PHONE_NUMBER_ID?: string;
  WA_TOKEN?: string;
  PLACEHOLDER_IMAGE_URL?: string;
  SEARCH_REFINEMENT_CHEAPER_FACTOR?: string;
  METUPS_PUBLIC_URL?: string;
  WHATSAPP_RATE_LIMIT_PER_MINUTE?: string;
  LOCAL_AI_BASE_URL?: string;
  LOCAL_AI_API_KEY?: string;
  LOCAL_AI_MODEL?: string;
  LOCAL_AI_TIMEOUT_MS?: string;
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

    localBaseUrl: env.LOCAL_AI_BASE_URL,
    localApiKey: env.LOCAL_AI_API_KEY,
    localModel: env.LOCAL_AI_MODEL,
    localTimeoutMs: env.LOCAL_AI_TIMEOUT_MS,
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

    const rateLimit = await consumePhoneRateLimit(supabase, message.phone, {
      limit: env.WHATSAPP_RATE_LIMIT_PER_MINUTE,
    });
    if (!rateLimit.allowed) {
      await writeEvent(supabase, {
        request_id: requestId,
        phone: message.phone,
        event_type: 'error',
        payload: { message_id: message.messageId, code: 'rate_limited', limit: rateLimit.limit },
        duration_ms: Date.now() - startedAt,
      });
      processed += 1;
      log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 429,
        event: 'message.rate_limited', messageId: message.messageId, limit: rateLimit.limit });
      continue;
    }

    const sessionResult = await loadSession(supabase, message.phone, {
      ttlMinutes: env.SESSION_TTL_MINUTES,
    });
    const activeSearch = sessionResult.session.current_stage === 'search_ready'
      ? sessionResult.session.context?.search
      : null;
    let intent = unknownConversationResult();
    let buyerStep = null;
    if (activeSearch?.resultIds?.length) {
      const selection = selectSearchResult(message.text, activeSearch.resultIds);
      if (selection.matched) {
        intent = { ...intent, intent: 'continue_conversation', confidence: 1, provider: 'session' };
        buyerStep = { selection };
      } else if (/^report$/i.test(message.text.trim()) && activeSearch.selectedProductId) {
        intent = { ...intent, intent: 'continue_conversation', confidence: 1, provider: 'session' };
        buyerStep = { reportProductId: activeSearch.selectedProductId };
      }
    }
    if (intent.intent === 'unknown') {
      const fastIntent = classifyFastIntent(message.text);
      if (fastIntent) {
        intent = fastIntent;
        log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
          event: 'intent.fast_classified', intent: intent.intent });
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
          log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 504,
            event: 'intent.classification_failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }
    let sessionState = {
      currentIntent: intent.intent,
      currentStage: sessionResult.session.current_stage,
      context: sessionResult.session.context,
    };
    let reply: string | null = null;
    let replyType: string | null = null;
    let resultListings: Array<Record<string, any>> | null = null;

    if (intent.intent === 'greeting') {
      reply = formatGreeting();
      replyType = 'greeting';
    } else if (intent.intent === 'help') {
      reply = formatHelp();
      replyType = 'help';
    } else if (intent.intent === 'cancel') {
      reply = formatSearchCancelled();
      replyType = 'search_cancelled';
      sessionState = { currentIntent: 'idle', currentStage: null, context: clearBuyerSearchContext(sessionResult.session.context) };
    } else if (intent.intent === 'unknown') {
      reply = formatUnknownRequest();
      replyType = 'unknown';
    }

    if (intent.intent === 'sell_product') {
      reply = formatSellerWebsiteRedirect(env.METUPS_PUBLIC_URL);
      replyType = 'seller_website_redirect';
      sessionState = { currentIntent: 'idle', currentStage: null, context: sessionResult.session.context };
    }

    if (buyerStep?.selection) {
      if (!buyerStep.selection.productId) {
        reply = formatInvalidSelection();
        replyType = 'invalid_product_selection';
      } else {
        const { data: product, error } = await supabase
          .from('products')
          .select('id,title,price,seller:profiles!seller_id(id,full_name,phone)')
          .eq('id', buyerStep.selection.productId)
          .eq('is_active', true)
          .eq('sold', false)
          .maybeSingle();
        if (error || !product) {
          reply = 'That listing is no longer available. Please run the search again.';
          replyType = 'product_unavailable';
        } else {
          reply = formatSelectedProduct(
            product,
            productShareUrl(env.METUPS_PUBLIC_URL, product.id),
            sellerWhatsAppUrl(product.seller?.phone, product.title),
          );
          replyType = 'product_selected';
          sessionState = {
            currentIntent: 'search_product', currentStage: 'search_ready',
            context: { ...sessionResult.session.context, search: { ...activeSearch, selectedProductId: product.id } },
          };
          await writeEvent(supabase, {
            request_id: requestId, phone: message.phone, event_type: 'product_selected',
            payload: { message_id: message.messageId, product_id: product.id }, duration_ms: Date.now() - startedAt,
          });
        }
      }
    }
    if (buyerStep?.reportProductId) {
      const { error } = await supabase.from('flags').insert({
        product_id: buyerStep.reportProductId,
        reporter_id: sessionResult.session.profile_id ?? null,
        reason: 'Reported through WhatsApp',
      });
      if (error) throw new Error(`Unable to report listing: ${error.message}`);
      reply = 'Thanks. We have sent this listing to the Metups moderation team for review.';
      replyType = 'listing_reported';
      await writeEvent(supabase, {
        request_id: requestId, phone: message.phone, event_type: 'listing_reported',
        payload: { message_id: message.messageId, product_id: buyerStep.reportProductId }, duration_ms: Date.now() - startedAt,
      });
    }

    const previousSearch = sessionResult.session.context?.search;
    const isSearchRefinement = !buyerStep && previousSearch?.criteria
      && (intent.intent === 'continue_conversation' || isSearchRefinementRequest(message.text));
    if (isSearchRefinement) {
      const criteria = refineSearchCriteria(previousSearch.criteria, intent.extracted, message.text, {
        cheaperFactor: env.SEARCH_REFINEMENT_CHEAPER_FACTOR,
      });
      if (criteria) {
        const candidates = await searchProducts(supabase, criteria);
        const results = rankProducts(candidates, criteria);
        resultListings = results;
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
      resultListings = results;
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
      if (resultListings?.length) await sendResults(env, message.phone, resultListings);
      else await sendWhatsAppMessage(message.phone, reply, env);
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
