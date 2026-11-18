import { normalizeMetaWebhook, verifyMetaSignature } from './message-intake.js';
import { createSupabaseClient } from './supabase';
import { loadSession, saveSessionState } from './session-service.js';
import { configureAI } from './ai/router';
import { processConversation, unknownConversationResult } from './ai/tasks/conversation';
import { classifyFastIntent } from './fast-intent-service';
import { buildSearchCriteria, searchProducts } from './search-service.js';
import { isMoreResultsRequest, isSearchRefinementRequest, refineSearchCriteria } from './search-refinement-service.js';
import { rankProducts } from './ranking-service.js';
import { formatCarouselSearchIntro, formatGreeting, formatHelp, formatInvalidSelection, formatResults, formatSearchCancelled, formatSearchClarification, formatSearchExhausted, formatSelectedProduct, formatSellerWebsiteRedirect, formatUnknownRequest } from '../utils/formatter.js';
import { sendResults, sendWhatsAppMessage } from '../services/whatsappService.js';
import { clearBuyerSearchContext, productShareUrl, resolveBuyerSearchStep, sellerWhatsAppUrl } from './buyer-selection-service.js';
import { consumePhoneRateLimit } from './rate-limit-service.js';
import { runWorkersAIBenchmark, isWorkersAIModel, } from './ai/providers/workersAI';
import { buildSearchContext, getSeenProductIds, hasSearchCriteriaChanged } from './search-history-service.js';
import { buildSearchDraft, clearSearchDraft, getSearchDraft, nextSearchClarification, resolveSearchDraftAnswer } from './buyer-conversation-service.js';

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
  AI_TOTAL_TIMEOUT_MS?: string;
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
  WORKERS_AI_GLM_MODEL?: string;
  WORKERS_AI_GEMMA_MODEL?: string;
  WORKERS_AI_TIMEOUT_MS?: string;
  GROQ_API_KEY?: string;
  GROQ_BASE_URL?: string;
  GROQ_FAST_MODEL?: string;
  GROQ_REASONING_MODEL?: string;
  GROQ_TIMEOUT_MS?: string;
  MISTRAL_API_KEY?: string;
  MISTRAL_BASE_URL?: string;
  MISTRAL_FAST_MODEL?: string;
  MISTRAL_STRONG_MODEL?: string;
  MISTRAL_TIMEOUT_MS?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_FAST_MODEL?: string;
  OPENAI_NANO_MODEL?: string;
  OPENAI_TIMEOUT_MS?: string;
  CEREBRAS_API_KEY?: string;
  CEREBRAS_BASE_URL?: string;
  CEREBRAS_FAST_MODEL?: string;
  CEREBRAS_TIMEOUT_MS?: string;
  DEV_AI_TEST_TOKEN?: string;
  AI?: Ai;
}

interface LogFields {
  timestamp: string;
  correlationId: string;
  route: string;
  status: number;
  event?: string;
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

    
  if (url.pathname === '/__dev/ai-test' && request.method === 'POST') {
    // This endpoint must never be accessible in production.
    if (env.ENVIRONMENT !== 'development') {
      return json({ error: 'Not found' }, 404);
    }

    const suppliedToken = request.headers.get('x-metups-dev-token') ?? '';

    if (
      !env.DEV_AI_TEST_TOKEN ||
      !constantTimeEqual(suppliedToken, env.DEV_AI_TEST_TOKEN)
    ) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const message =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>).message
        : null;

    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 1000
    ) {
      return json({ error: 'A message between 1 and 1000 characters is required' }, 400);
    }

    configureAIFromEnv(env);

    let result;
    try {
      result = await processConversation({
        message: message.trim(),
        context: {
          currentIntent: 'idle',
          currentStage: null,
          extractedFilters: {},
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 500) : 'Unknown AI test failure';
      log({
        timestamp: new Date().toISOString(),
        correlationId,
        route: url.pathname,
        status: 502,
        event: 'ai.test_failed',
        error: detail,
      });
      // This endpoint is development-only and token-protected. Returning a
      // concise provider failure makes capacity diagnosis possible while the
      // production webhook retains its generic error behavior.
      return json({ error: 'AI test failed', detail }, 502);
    }

    return json({
      ok: true,
      result,
      localProviderConfirmed: result.provider === 'local_llama',
    });
  }

  // Independent Cloudflare Workers AI benchmark endpoint.
  if (
    url.pathname === '/__dev/workers-ai-test' &&
    request.method === 'POST'
  ) {
    if (env.ENVIRONMENT !== 'development') {
      return json({ error: 'Not found' }, 404);
    }

    const suppliedToken = request.headers.get('x-metups-dev-token') ?? '';

    if (
      !env.DEV_AI_TEST_TOKEN ||
      !constantTimeEqual(suppliedToken, env.DEV_AI_TEST_TOKEN)
    ) {
      return json({ error: 'Unauthorized' }, 401);
    }

    if (!env.AI) {
      return json({ error: 'Workers AI binding is unavailable' }, 503);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const payload =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const message = payload.message;
    const model = payload.model;

    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 1000
    ) {
      return json({
        error: 'A message between 1 and 1000 characters is required',
      }, 400);
    }

    if (!isWorkersAIModel(model)) {
      return json({
        error: 'Unsupported model',
        allowedModels: [
          '@cf/zai-org/glm-4.7-flash',
          '@cf/google/gemma-4-26b-a4b-it',
        ],
      }, 400);
    }

        // Use idle context by default, or accept supplied benchmark context.
    let benchmarkContext = {
      currentIntent: 'idle',
      currentStage: null as string | null,
      extractedFilters: {} as Record<string, unknown>,
    };

    if (payload.context !== undefined) {
      const suppliedContext = payload.context;

      if (
        typeof suppliedContext !== 'object' ||
        suppliedContext === null ||
        Array.isArray(suppliedContext)
      ) {
        return json({ error: 'Invalid context object' }, 400);
      }

      const context = suppliedContext as Record<string, unknown>;

      const allowedKeys = [
        'currentIntent',
        'currentStage',
        'extractedFilters',
      ];

      if (Object.keys(context).some(key => !allowedKeys.includes(key))) {
        return json({ error: 'Unsupported context field' }, 400);
      }

      const currentIntent = context.currentIntent ?? 'idle';
      const currentStage = context.currentStage ?? null;
      const extractedFilters = context.extractedFilters ?? {};

      if (
        typeof currentIntent !== 'string' ||
        currentIntent.length > 50
      ) {
        return json({ error: 'Invalid currentIntent' }, 400);
      }

      if (
        currentStage !== null &&
        (typeof currentStage !== 'string' || currentStage.length > 80)
      ) {
        return json({ error: 'Invalid currentStage' }, 400);
      }

      if (
        typeof extractedFilters !== 'object' ||
        extractedFilters === null ||
        Array.isArray(extractedFilters)
      ) {
        return json({ error: 'Invalid extractedFilters' }, 400);
      }

      if (JSON.stringify(extractedFilters).length > 4000) {
        return json({ error: 'Context is too large' }, 400);
      }

      benchmarkContext = {
        currentIntent,
        currentStage,
        extractedFilters: extractedFilters as Record<string, unknown>,
      };
    }

    const result = await runWorkersAIBenchmark(
      env.AI,
      model,
      {
        message: message.trim(),
        context: benchmarkContext,
      },
    );

    return json({
      ok: result.success,
      benchmark: result,
    });
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
  configureAIFromEnv(env);
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
    let buyerStep: any = null;
    const classificationStartedAt = Date.now();
    let classificationPath = 'session';
    if (activeSearch) {
      const sessionStep = resolveBuyerSearchStep(message.text, activeSearch);
      if (sessionStep?.selection) {
        intent = { ...intent, intent: 'continue_conversation', confidence: 1, provider: 'session' };
        buyerStep = sessionStep;
      } else if (sessionStep?.reportProductId) {
        intent = { ...intent, intent: 'continue_conversation', confidence: 1, provider: 'session' };
        buyerStep = sessionStep;
      }
    }
    const searchDraft = getSearchDraft(sessionResult.session.context);
    if (!buyerStep && searchDraft) {
      const draftAnswer = resolveSearchDraftAnswer(searchDraft, message.text);
      if (draftAnswer) {
        intent = {
          ...intent,
          intent: 'search_product',
          confidence: 1,
          provider: 'session',
          extracted: {},
        };
        buyerStep = { searchDraft: draftAnswer };
      }
    }
    if (intent.intent === 'unknown') {
      const fastIntent = classifyFastIntent(message.text);
      if (fastIntent) {
        intent = fastIntent;
        classificationPath = 'rules';
        log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
          event: 'intent.fast_classified', intent: intent.intent });
      } else {
        classificationPath = 'ai';
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
    const classificationDurationMs = Date.now() - classificationStartedAt;
    let sessionState = {
      currentIntent: intent.intent,
      currentStage: sessionResult.session.current_stage,
      context: sessionResult.session.context,
    };
    let reply: string | null = null;
    let replyType: string | null = null;
    let resultListings: Array<Record<string, any>> | null = null;
    let pendingSearchState: {
      criteria: Record<string, unknown>;
      results: Array<Record<string, any>>;
      previousSearch: Record<string, any> | null;
      resetHistory: boolean;
      incremental: boolean;
      candidateCount: number;
      searchDurationMs: number;
    } | null = null;

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
    const isMoreResults = !buyerStep && previousSearch?.criteria && isMoreResultsRequest(message.text);
    const isSearchRefinement = !buyerStep && previousSearch?.criteria && !isMoreResults
      && (intent.intent === 'continue_conversation' || isSearchRefinementRequest(message.text));
    if (isMoreResults) {
      const criteria = previousSearch.criteria;
      const seenProductIds = getSeenProductIds(previousSearch);
      const searchStartedAt = Date.now();
      const candidates = await searchProducts(supabase, criteria, { excludeIds: seenProductIds });
      const results = rankProducts(candidates, criteria);
      const searchDurationMs = Date.now() - searchStartedAt;
      resultListings = results;
      reply = results.length ? formatResults(results, criteria) : formatSearchExhausted(criteria);
      replyType = results.length ? 'search_more_results' : 'search_exhausted';
      pendingSearchState = {
        criteria, results, previousSearch, resetHistory: false, incremental: true,
        candidateCount: candidates.length, searchDurationMs,
      };
    } else if (isSearchRefinement) {
      const criteria = refineSearchCriteria(previousSearch.criteria, intent.extracted, message.text, {
        cheaperFactor: env.SEARCH_REFINEMENT_CHEAPER_FACTOR,
      });
      if (criteria) {
        const searchStartedAt = Date.now();
        const candidates = await searchProducts(supabase, criteria);
        const results = rankProducts(candidates, criteria);
        const searchDurationMs = Date.now() - searchStartedAt;
        resultListings = results;
        reply = formatResults(results, criteria);
        replyType = 'search_refinement';
        pendingSearchState = {
          criteria,
          results,
          previousSearch,
          resetHistory: hasSearchCriteriaChanged(previousSearch.criteria, criteria),
          incremental: false,
          candidateCount: candidates.length,
          searchDurationMs,
        };
      }
    } else if (intent.intent === 'search_product') {
      const criteria = buyerStep?.searchDraft?.criteria ?? buildSearchCriteria(intent.extracted);
      const clarification = nextSearchClarification(criteria);
      if (clarification) {
        reply = formatSearchClarification(criteria, clarification.pendingQuestion);
        replyType = `search_clarification_${clarification.pendingQuestion}`;
        sessionState = {
          currentIntent: 'search_product',
          currentStage: `awaiting_${clarification.pendingQuestion}`,
          context: {
            ...clearBuyerSearchContext(sessionResult.session.context),
            searchDraft: buildSearchDraft(criteria, clarification.pendingQuestion),
          },
        };
      } else {
        const searchStartedAt = Date.now();
        const candidates = await searchProducts(supabase, criteria);
        const results = rankProducts(candidates, criteria);
        const searchDurationMs = Date.now() - searchStartedAt;
        resultListings = results;
        reply = formatResults(results, criteria);
        replyType = 'search_results';
        pendingSearchState = {
          criteria,
          results,
          previousSearch: null,
          resetHistory: true,
          incremental: false,
          candidateCount: candidates.length,
          searchDurationMs,
        };
        log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
          event: 'search.completed', messageId: message.messageId, candidates: candidates.length, results: results.length, searchDurationMs });
      }
    }

    await writeEvent(supabase, {
      request_id: requestId,
      phone: message.phone,
      event_type: 'message_received',
      payload: { message_id: message.messageId, type: message.type },
      duration_ms: Date.now() - startedAt,
    });
    if (reply) {
      if (resultListings?.length) {
        await sendResults(env, message.phone, resultListings, {}, {
          carouselBodyText: formatCarouselSearchIntro(
            pendingSearchState?.criteria ?? {},
            resultListings.length,
          ),
        });
      }
      else await sendWhatsAppMessage(message.phone, reply, env);
      if (pendingSearchState) {
        const search = buildSearchContext(
          pendingSearchState.criteria,
          pendingSearchState.results,
          pendingSearchState.previousSearch,
          { resetHistory: pendingSearchState.resetHistory },
        );
        sessionState = {
          currentIntent: 'search_product',
          currentStage: 'search_ready',
          context: { ...clearSearchDraft(sessionResult.session.context), search },
        };
        await writeEvent(supabase, {
          request_id: requestId,
          phone: message.phone,
          event_type: 'search_run',
          payload: {
            message_id: message.messageId,
            criteria: pendingSearchState.criteria,
            candidate_count: pendingSearchState.candidateCount,
            result_count: pendingSearchState.results.length,
            newly_displayed_count: pendingSearchState.results.length,
            excluded_seen_count: pendingSearchState.incremental ? getSeenProductIds(previousSearch).length : 0,
            incremental: pendingSearchState.incremental,
            exhausted: pendingSearchState.incremental && pendingSearchState.results.length === 0,
            search_duration_ms: pendingSearchState.searchDurationMs,
          },
          duration_ms: Date.now() - startedAt,
        });
      }
      await writeEvent(supabase, {
        request_id: requestId,
        phone: message.phone,
        event_type: 'reply_sent',
        payload: { message_id: message.messageId, reply_type: replyType },
        duration_ms: Date.now() - startedAt,
      });
    }
    const updatedSession = await saveSessionState(supabase, message.phone, sessionState, {
      ttlMinutes: env.SESSION_TTL_MINUTES,
    });
    await writeEvent(supabase, {
      request_id: requestId,
      phone: message.phone,
      event_type: 'intent_classified',
      payload: { message_id: message.messageId, intent: intent.intent, confidence: intent.confidence, provider: intent.provider,
        classification_path: classificationPath, classification_duration_ms: classificationDurationMs,
        ai_calls: classificationPath === 'ai' ? 1 : 0 },
      duration_ms: Date.now() - startedAt,
    });
    processed += 1;
    log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
      event: 'message.session_attached', messageId: message.messageId, type: message.type,
      sessionId: updatedSession.id, sessionCreated: sessionResult.created, sessionReset: sessionResult.reset,
      intent: intent.intent, confidence: intent.confidence, classificationPath, classificationDurationMs });
  }

  log({ timestamp: new Date().toISOString(), correlationId: requestId, route: '/webhook', status: 200,
    event: 'intake.complete', processed, duplicates, durationMs: Date.now() - startedAt });
}

function configureAIFromEnv(env: Env): void {
  configureAI({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
    localBaseUrl: env.LOCAL_AI_BASE_URL,
    localApiKey: env.LOCAL_AI_API_KEY,
    localModel: env.LOCAL_AI_MODEL,
    localTimeoutMs: env.LOCAL_AI_TIMEOUT_MS,
    totalTimeoutMs: env.AI_TOTAL_TIMEOUT_MS,
    workersAI: env.AI,
    workersAIGlmModel: env.WORKERS_AI_GLM_MODEL,
    workersAIGemmaModel: env.WORKERS_AI_GEMMA_MODEL,
    workersAITimeoutMs: env.WORKERS_AI_TIMEOUT_MS,
    groqFast: {
      name: 'groq_fast', baseUrl: env.GROQ_BASE_URL, apiKey: env.GROQ_API_KEY,
      model: env.GROQ_FAST_MODEL, timeoutMs: env.GROQ_TIMEOUT_MS,
    },
    groqReasoning: {
      name: 'groq_reasoning', baseUrl: env.GROQ_BASE_URL, apiKey: env.GROQ_API_KEY,
      model: env.GROQ_REASONING_MODEL, timeoutMs: env.GROQ_TIMEOUT_MS,
    },
    mistralFast: {
      name: 'mistral_fast', baseUrl: env.MISTRAL_BASE_URL, apiKey: env.MISTRAL_API_KEY,
      model: env.MISTRAL_FAST_MODEL, timeoutMs: env.MISTRAL_TIMEOUT_MS,
    },
    mistralStrong: {
      name: 'mistral_strong', baseUrl: env.MISTRAL_BASE_URL, apiKey: env.MISTRAL_API_KEY,
      model: env.MISTRAL_STRONG_MODEL, timeoutMs: env.MISTRAL_TIMEOUT_MS,
    },
    openAIFast: {
      name: 'openai_fast', baseUrl: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_FAST_MODEL, timeoutMs: env.OPENAI_TIMEOUT_MS,
    },
    openAINano: {
      name: 'openai_nano', baseUrl: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_NANO_MODEL, timeoutMs: env.OPENAI_TIMEOUT_MS,
    },
    cerebrasFast: {
      name: 'cerebras_fast', baseUrl: env.CEREBRAS_BASE_URL, apiKey: env.CEREBRAS_API_KEY,
      model: env.CEREBRAS_FAST_MODEL, timeoutMs: env.CEREBRAS_TIMEOUT_MS,
    },
  });
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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function log(fields: LogFields & Record<string, unknown>): void {
  console.log(JSON.stringify(fields));
}
