// Cloudflare Worker: serves the static application and enriches product links
// with Open Graph tags for crawlers that do not execute client-side JavaScript.

const SUPABASE_URL = 'https://cnmmdxmbdlrvvtvqqjpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubW1keG1iZGxydnZ0dnFxanBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjkzMDQsImV4cCI6MjA3NDU0NTMwNH0.iHPsWJQvPlZEO4gvxqijP0T-4zsJADlp4XZx_ADw1Cs';
const FALLBACK_IMAGE = 'https://metups.com/assets/icons/og-image.jpg';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
