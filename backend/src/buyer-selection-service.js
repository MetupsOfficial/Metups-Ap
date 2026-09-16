/** Resolve a numeric reply solely against the product IDs retained in this phone's session. */
export function selectSearchResult(message, resultIds = []) {
  if (!/^\d+$/.test(String(message ?? '').trim())) return { matched: false };
  const index = Number(message) - 1;
  return {
    matched: true,
    productId: Number.isInteger(index) && index >= 0 && index < resultIds.length ? resultIds[index] : null,
  };
}

/** Build a shareable canonical listing URL from explicit environment configuration. */
export function productShareUrl(publicBaseUrl, productId) {
  const base = String(publicBaseUrl ?? '').replace(/\/+$/, '');
  if (!base) throw new Error('Metups public URL is not configured');
  return `${base}/features/products/product.html?id=${encodeURIComponent(productId)}`;
}

/** A seller has chosen WhatsApp contact by attaching a phone to their profile. */
export function sellerWhatsAppUrl(phone, productTitle) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  const message = `Hi, I am interested in your Metups listing: ${String(productTitle ?? 'this item')}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
