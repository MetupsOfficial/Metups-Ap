import { extractIncomingMessage } from '../services/messageService.js';
import { parseSearchRequest, matchesCriteria } from '../services/searchService.js';
import { rankResults } from '../services/rankingService.js';
import { formatResults } from '../utils/formatter.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { logEvent } from '../utils/logger.js';
import { config } from '../config/supabase.js';

export async function handleWebhook(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.verifyToken) {
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

    const criteria = parseSearchRequest(message);
    const listings = await searchListings(criteria);
    const ranked = rankResults(listings, criteria);
    const reply = formatResults(ranked, criteria);

    await sendWhatsAppMessage(phone, reply);

    res.status(200).json({ ok: true, reply });
  } catch (error) {
    logEvent('Webhook failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
}

async function searchListings(criteria) {
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };

  const query = new URLSearchParams({
    select: 'id,title,description,price,location',
    limit: '10',
  });

  const response = await fetch(`${config.supabaseUrl}/rest/v1/products?${query.toString()}`, { headers });
  if (!response.ok) {
    throw new Error('Supabase query failed');
  }

  const records = await response.json();
  return Array.isArray(records)
    ? records.filter(item => item && item.title && matchesCriteria(item, criteria))
    : [];
}
