import { extractIncomingMessage } from '../services/messageService.js';
import { parseSearchRequest, matchesCriteria } from '../services/searchService.js';
import { rankResults } from '../services/rankingService.js';
import { formatResults } from '../utils/formatter.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { logEvent } from '../utils/logger.js';
import { handleSelection } from '../services/conversationService.js';
import { handleSellerMessage } from '../services/sellerService.js';
import { publishListing } from '../services/listingService.js';

const sessions = new Map();

export async function handleWebhook(req, res, env = {}) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
    return;
  }

  if (req.method !== 'POST') {
    res.sendStatus(405);
    return;
  }

  try {
    const payload = req.body;
    const { phone, message } = extractIncomingMessage(payload);

    logEvent('Incoming WhatsApp message', { phone, message });

    if (!phone || !message) {
      res.status(200).json({ ok: true, status: 'ignored' });
      return;
    }

    const sessionKey = phone;
    const session = sessions.get(sessionKey) || { listings: [], sellerDraft: null };

    if (/^\d+$/.test(message.trim()) && session.listings.length) {
      const reply = handleSelection(message, session.listings);
      sessions.delete(sessionKey);
      await sendWhatsAppMessage(phone, reply, env);
      res.status(200).json({ ok: true, reply, mode: 'selection' });
      return;
    }

    if (/sell|selling|i want to sell/i.test(message) && !session.sellerDraft) {
      const sellerResult = handleSellerMessage(message, null);
      sessions.set(sessionKey, { ...session, sellerDraft: sellerResult.draft });
      await sendWhatsAppMessage(phone, sellerResult.response, env);
      res.status(200).json({ ok: true, reply: sellerResult.response, mode: 'seller_start' });
      return;
    }

    if (session.sellerDraft) {
      if (/publish/i.test(message)) {
        const result = await publishListing(session.sellerDraft, env);
        const reply = result.ok
          ? 'Your listing has been published.'
          : `I could not publish it yet: ${result.error}`;
        sessions.delete(sessionKey);
        await sendWhatsAppMessage(phone, reply, env);
        res.status(200).json({ ok: true, reply, mode: 'publish' });
        return;
      }

      const sellerResult = handleSellerMessage(message, session.sellerDraft);
      sessions.set(sessionKey, { ...session, sellerDraft: sellerResult.draft });
      await sendWhatsAppMessage(phone, sellerResult.response, env);
      res.status(200).json({ ok: true, reply: sellerResult.response, mode: 'seller_flow' });
      return;
    }

    const criteria = parseSearchRequest(message);
    const listings = await searchListings(criteria, env);
    const ranked = rankResults(listings, criteria);
    const reply = formatResults(ranked, criteria);

    sessions.set(sessionKey, { listings: ranked });
    await sendWhatsAppMessage(phone, reply, env);

    res.status(200).json({ ok: true, reply, mode: 'buyer_search' });
  } catch (error) {
    logEvent('Webhook failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
}

/** Cloudflare Worker adapter for the same webhook business logic. */
export async function handleWebhookRequest(request, env = {}) {
  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') {
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
  }

  let response;
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      response = new Response(JSON.stringify(data), {
        status: this.statusCode || 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
      return this;
    },
    send(data) {
      response = new Response(String(data), { status: this.statusCode || 200 });
      return this;
    },
    sendStatus(code) {
      response = new Response(null, { status: code });
      return this;
    },
  };

  await handleWebhook({ method: request.method, query: Object.fromEntries(url.searchParams), body }, res, env);
  return response || new Response(null, { status: 204 });
}

async function searchListings(criteria, env) {
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const query = new URLSearchParams({
    select: 'id,title,description,price,location',
    limit: '10',
  });

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/products?${query.toString()}`, { headers });
  if (!response.ok) {
    throw new Error('Supabase query failed');
  }

  const records = await response.json();
  return Array.isArray(records)
    ? records.filter(item => item && item.title && matchesCriteria(item, criteria))
    : [];
}
