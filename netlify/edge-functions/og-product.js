// netlify/edge-functions/og-product.js
//
// Intercepts requests to /features/products/product.html?id=<uuid>
// and injects server-side Open Graph meta tags so WhatsApp, Twitter,
// Facebook, iMessage etc. show the product image in link previews.
//
// Social scrapers don't run JavaScript, so dynamic og: tags set by the
// client are invisible to them — this is the only way to fix that on a
// static site.

const SUPABASE_URL      = 'https://cnmmdxmbdlrvvtvqqjpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubW1keG1iZGxydnZ0dnFxanBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NjkzMDQsImV4cCI6MjA3NDU0NTMwNH0.iHPsWJQvPlZEO4gvxqijP0T-4zsJADlp4XZx_ADw1Cs';

const FALLBACK_IMAGE = 'https://metups.com/assets/icons/og-image.jpg';

export default async (request, context) => {
  const url       = new URL(request.url);
  const productId = url.searchParams.get('id');

  // No product ID — serve page as-is
  if (!productId) return context.next();

  try {
    const apiHeaders = {
      apikey:        SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };

    // Fetch product + first image in parallel
    const [productRes, imageRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=title,price,condition,location&limit=1`,
        { headers: apiHeaders }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/product_images?product_id=eq.${productId}&select=image_url&order=image_order.asc&limit=1`,
        { headers: apiHeaders }
      ),
    ]);

    const [products, images] = await Promise.all([
      productRes.json(),
      imageRes.json(),
    ]);

    if (!Array.isArray(products) || !products.length) return context.next();

    const product    = products[0];
    const imagePath  = images?.[0]?.image_url;
    const imageUrl   = imagePath
      ? `${SUPABASE_URL}/storage/v1/object/public/product_images/${imagePath}`
      : FALLBACK_IMAGE;

    const ogTitle = `${esc(product.title)} — $${product.price} | Metups`;
    const ogDesc  = `${esc(product.condition)} · ${esc(product.location)} · Buy pre-owned on Metups Zimbabwe`;
    const ogUrl   = url.toString();

    const injected = `
  <meta property="og:type"         content="product">
  <meta property="og:site_name"    content="Metups">
  <meta property="og:title"        content="${ogTitle}">
  <meta property="og:description"  content="${ogDesc}">
  <meta property="og:image"        content="${imageUrl}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url"          content="${ogUrl}">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
  <meta name="twitter:image"       content="${imageUrl}">`;

    // Fetch the original static HTML
    const original = await context.next();
    const html     = await original.text();

    // Inject tags just before </head>
    const patched = html.replace('</head>', `${injected}\n</head>`);

    return new Response(patched, {
      status:  original.status,
      headers: {
        'content-type':  'text/html; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=300',
      },
    });

  } catch {
    // Any failure → fall through to the normal static page
    return context.next();
  }
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const config = { path: '/features/products/product.html' };
