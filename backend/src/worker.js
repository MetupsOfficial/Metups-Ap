import { assertConfig, configure } from '../config/supabase.js';
import { routeWebhook } from '../routes/webhook.js';

export default {
  async fetch(request, env) {
    configure(env);

    const url = new URL(request.url);

    // Meta webhook verification
    if (request.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === env.VERIFY_TOKEN) {
        return new Response(challenge, {
          status: 200,
          headers: {
            "content-type": "text/plain",
          },
        });
      }
    }

    if (url.pathname === '/webhook') {
      try {
        assertConfig();
      } catch (error) {
        return json({ ok: false, error: error.message }, 503);
      }

      return routeWebhook(request);
    }

    if (url.pathname === '/health') {
      return json({ ok: true, status: 'healthy' });
    }

    if (url.pathname === '/') {
      return json({ ok: true, service: 'metups-api', status: 'running' });
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
