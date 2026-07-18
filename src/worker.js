// Cloudflare Worker: serves the static application and enriches product links
// with Open Graph tags for crawlers that do not execute client-side JavaScript.

const SUPABASE_URL = 'https://cnmmdxmbdlrvvtvqqjpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubW1keG1iZGxydnZ0dnFxanBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjkzMDQsImV4cCI6MjA3NDU0NTMwNH0.iHPsWJQvPlZEO4gvxqijP0T-4zsJADlp4XZx_ADw1Cs';
const FALLBACK_IMAGE = 'https://metups.com/assets/icons/og-image.jpg';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/mcc/attachments' && request.method === 'POST') {
      return uploadMccAttachments(request, env);
    }
    if (url.pathname === '/api/mcc/attachment' && request.method === 'GET') {
      return signMccAttachment(request, env);
    }
    if (url.pathname !== '/features/products/product.html' || !url.searchParams.get('id')) {
      return env.ASSETS.fetch(request);
    }

    try {
      const id = url.searchParams.get('id');
      const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
      const [productResponse, imageResponse, pageResponse] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=title,price,condition,location&limit=1`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/product_images?product_id=eq.${encodeURIComponent(id)}&select=image_url&order=image_order.asc&limit=1`, { headers }),
        env.ASSETS.fetch(request),
      ]);
      const [products, images, html] = await Promise.all([productResponse.json(), imageResponse.json(), pageResponse.text()]);
      if (!Array.isArray(products) || !products.length) return new Response(html, pageResponse);

      const product = products[0];
      const image = images?.[0]?.image_url
        ? `${SUPABASE_URL}/storage/v1/object/public/product_images/${images[0].image_url}`
        : FALLBACK_IMAGE;
      const title = `${escapeHtml(product.title)} — $${escapeHtml(product.price)} | Metups`;
      const description = `${escapeHtml(product.condition)} · ${escapeHtml(product.location)} · Buy pre-owned on Metups Zimbabwe`;
      const metas = `\n<meta property="og:type" content="product"><meta property="og:site_name" content="Metups"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${image}"><meta property="og:url" content="${escapeHtml(url.href)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}">`;
      return new Response(html.replace('</head>', `${metas}\n</head>`), {
        status: pageResponse.status,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300' },
      });
    } catch {
      return env.ASSETS.fetch(request);
    }
  },
};

async function uploadMccAttachments(request, env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, error: 'Attachment uploads are not configured' }, 503);
  const token = request.headers.get('X-Admin-Token');
  if (!token) return json({ ok: false, error: 'Missing admin session' }, 401);
  try {
    const verify = await supabaseRpc('admin_verify', { p_token: token }, SUPABASE_ANON_KEY);
    if (!verify?.ok || verify.admin?.role > 1) return json({ ok: false, error: 'Unauthorized' }, 403);
    const form = await request.formData();
    const workItemId = String(form.get('work_item_id') || '');
    const files = form.getAll('files').filter(value => value instanceof File);
    if (!/^[0-9a-f-]{36}$/i.test(workItemId) || !files.length) return json({ ok: false, error: 'A record and at least one file are required' }, 400);
    if (files.length > 5 || files.some(file => file.size > 10 * 1024 * 1024)) return json({ ok: false, error: 'Upload up to five files, 10 MB each' }, 400);
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    if (files.some(file => !allowed.has(file.type))) return json({ ok: false, error: 'Unsupported file type' }, 400);
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
      const path = `${workItemId}/${crypto.randomUUID()}-${safeName}`;
      const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/mcc-attachments/${path}`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': file.type, 'x-upsert': 'false' }, body: file.stream() });
      if (!upload.ok) throw new Error('Storage upload failed');
      const record = await supabaseRpc('mcc_add_attachment', { p_token: token, p_work_item_id: workItemId, p_storage_path: path, p_file_name: file.name, p_content_type: file.type, p_byte_size: file.size }, SUPABASE_ANON_KEY);
      if (!record?.ok) throw new Error(record?.error || 'Could not register attachment');
    }
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Upload failed' }, 500);
  }
}

async function signMccAttachment(request, env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, error: 'Attachment downloads are not configured' }, 503);
  const token = request.headers.get('X-Admin-Token');
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!token || !path || path.includes('..')) return json({ ok: false, error: 'Invalid attachment request' }, 400);
  try {
    const verify = await supabaseRpc('admin_verify', { p_token: token }, SUPABASE_ANON_KEY);
    if (!verify?.ok || verify.admin?.role > 1) return json({ ok: false, error: 'Unauthorized' }, 403);
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/mcc-attachments/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, body: JSON.stringify({ expiresIn: 300 }) });
    const data = await response.json();
    if (!response.ok || !data?.signedURL) throw new Error('Could not create a download link');
    return json({ ok: true, url: `${SUPABASE_URL}/storage/v1${data.signedURL}` });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Download failed' }, 500);
  }
}

async function supabaseRpc(name, body, key) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  return response.json();
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
