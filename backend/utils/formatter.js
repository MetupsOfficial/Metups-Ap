export function formatResults(results, criteria) {
  if (!results.length) {
    return formatZeroResults(criteria);
  }

  const intro = `🔎 Found ${results.length} match${results.length === 1 ? '' : 'es'} for "${searchLabel(criteria)}"`;
  const lines = results.map((item, index) => {
    const price = item.price != null ? `$${item.price}` : 'Price not listed';
    const details = [item.location || item.city_name, item.condition].filter(Boolean).join(' · ');
    const sellerTrust = formatSellerTrust(item.seller);
    return `${numberEmoji(index + 1)} ${item.title || 'Untitled listing'} — ${price}\n   ${details ? `📍 ${details}` : '📍 Location not listed'}${sellerTrust ? `\n   ${sellerTrust}` : ''}`;
  });

  return [intro, ...lines, 'Reply with a number to contact that seller, or tell me what to change.'].join('\n\n');
}

export function formatZeroResults(criteria) {
  const budget = criteria.budgetMax != null ? ` under $${criteria.budgetMax}` : '';
  return [
    `No matches yet for "${searchLabel(criteria)}"${budget}.`,
    'Want me to:\n1. Search with a higher budget\n2. Try another location\n3. Search a similar category',
  ].join('\n\n');
}

export function formatHelp() {
  return 'Tell me what you are looking for, for example: “laptop under $300 in Harare”.\n\nListings are created on the Metups website.';
}

export function formatError() {
  return 'Sorry, I could not complete that just now. Please try again in a moment.';
}

export function formatSellerWebsiteRedirect(publicBaseUrl) {
  const base = String(publicBaseUrl ?? '').replace(/\/+$/, '');
  const url = base ? `${base}/features/products/add_product.html` : 'the Metups website';
  return `Listings and product photos are managed on Metups.com. Create your listing here: ${url}`;
}

export function formatSelectedProduct(product, productUrl, sellerChatUrl) {
  const price = product.price != null ? `$${product.price}` : 'Price not listed';
  const whatsappOption = sellerChatUrl
    ? `1. Message ${product.seller?.full_name || 'the seller'} on WhatsApp: ${sellerChatUrl}`
    : '1. The seller has not provided a WhatsApp contact.';
  return `You selected “${product.title}” — ${price}.\n\n${whatsappOption}\n2. Chat on Metups: ${productUrl}\n\nReply REPORT to flag this listing, or tell me what to search for next.`;
}

export function formatInvalidSelection() {
  return 'Please reply with one of the result numbers shown, or tell me how to refine the search.';
}

function searchLabel(criteria) {
  return criteria.category || 'listings';
}

function numberEmoji(number) {
  return ['1️⃣', '2️⃣', '3️⃣'][number - 1] || `${number}.`;
}

function formatSellerTrust(seller) {
  const profile = Array.isArray(seller) ? seller[0] : seller;
  if (!profile) return '';
  const average = Number(profile.rating_avg);
  const count = Number(profile.rating_count);
  const rating = Number.isFinite(average) && average > 0
    ? `⭐ ${average.toFixed(1)}${Number.isFinite(count) && count > 0 ? ` (${count} review${count === 1 ? '' : 's'})` : ''}`
    : '';
  const verifiedPhone = profile.phone_verified === true ? '✓ Phone verified' : '';
  return [rating, verifiedPhone].filter(Boolean).join(' · ');
}
