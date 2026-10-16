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

/** Normalize Zimbabwean seller numbers for WhatsApp click-to-chat URLs. */
export function toWaNumber(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('263')) return digits;
  if (digits.startsWith('0')) return `263${digits.slice(1)}`;
  if (digits.length === 9) return `263${digits}`;
  return digits;
}

export function contactLink(listing) {
  const title = listing.title || 'this listing';
  const price = listing.price != null ? listing.price : 'Price not listed';
  const text = `Hi, I saw your ${title} ($${price}) on Metups. Is it still available?`;
  return `https://wa.me/${toWaNumber(listing.seller_phone)}?text=${encodeURIComponent(text)}`;
}

export function formatListingCardText(listing) {
  const title = truncate(String(listing.title || 'Untitled listing'), 60);
  const price = listing.price != null ? `$${listing.price}` : 'Price not listed';
  const condition = listing.condition || 'Condition not listed';
  const city = listing.city || listing.city_name || listing.location || 'Location not listed';
  return `*${title}*\n${price} · ${condition}\n📍 ${city}`.slice(0, 160);
}

export function buildSingleListingPayload(to, listing) {
  const interactive = { type: 'cta_url' };
  if (isHttpsUrl(listing.image_url)) {
    interactive.header = { type: 'image', image: { link: listing.image_url } };
  }
  interactive.body = { text: formatListingCardText(listing) };
  interactive.action = {
    name: 'cta_url',
    parameters: { display_text: 'Contact seller', url: contactLink(listing) },
  };
  return { messaging_product: 'whatsapp', to, type: 'interactive', interactive };
}

export function buildCarouselPayload(to, listings, placeholderImageUrl) {
  if (!isHttpsUrl(placeholderImageUrl) && listings.some(item => !isHttpsUrl(item.image_url))) {
    throw new Error('PLACEHOLDER_IMAGE_URL must be a public HTTPS URL when a listing has no image');
  }
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'carousel',
      body: { text: `Found ${listings.length} matches. Swipe to browse` },
      action: {
        cards: listings.map((listing, card_index) => ({
          card_index,
          type: 'cta_url',
          header: { type: 'image', image: { link: isHttpsUrl(listing.image_url) ? listing.image_url : placeholderImageUrl } },
          body: { text: formatListingCardText(listing) },
          action: {
            name: 'cta_url',
            parameters: { display_text: 'Contact seller', url: contactLink(listing) },
          },
        })),
      },
    },
  };
}

function truncate(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function isHttpsUrl(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value);
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

export function formatGreeting() {
  return 'Hi! Tell me what you are looking for, for example: “laptop under $300 in Harare”.';
}

export function formatSearchCancelled() {
  return 'Your current search has been cleared. Tell me what you would like to find next.';
}

export function formatUnknownRequest() {
  return 'I can help you find products on Metups. Try: “phone under $200 in Harare”, or reply HELP.';
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
