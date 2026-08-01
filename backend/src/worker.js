import { assertConfig, configure } from '../config/supabase.js';
import { routeWebhook } from '../routes/webhook.js';

export default {
  async fetch(request, env) {
    configure(env);
    const url = new URL(request.url);

    if (url.pathname === '/webhook') {
      try {
        assertConfig();
      } catch (error) {
        return json({ ok: false, error: error.message }, 503);
      }
      return routeWebhook(request);
    }
    if (url.pathname === '/health') return json({ ok: true, status: 'healthy' });
    if (url.pathname === '/') return json({ ok: true, service: 'metups-api', status: 'running' });

    return json({ ok: false, error: 'Not found' }, 404);
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
