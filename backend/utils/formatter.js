export function formatResults(results, criteria) {
  if (!results.length) {
    return formatZeroResults(criteria);
  }

  const intro = `🔎 Found ${results.length} match${results.length === 1 ? '' : 'es'} for "${searchLabel(criteria)}"`;
  const lines = results.map((item, index) => {
    const price = item.price != null ? `$${item.price}` : 'Price not listed';
    const details = [item.location || item.city_name, item.condition].filter(Boolean).join(' · ');
    return `${numberEmoji(index + 1)} ${item.title || 'Untitled listing'} — ${price}\n   ${details ? `📍 ${details}` : '📍 Location not listed'}`;
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
  return 'Tell me what you are looking for, for example: “laptop under $300 in Harare”.\n\nYou can also say “I want to sell something”.';
}

export function formatError() {
  return 'Sorry, I could not complete that just now. Please try again in a moment.';
}

export function formatSelectedProduct(product, shareUrl) {
  const price = product.price != null ? `$${product.price}` : 'Price not listed';
  return `You selected “${product.title}” — ${price}.\n\nView or share it: ${shareUrl}\n\nReply REPORT to flag this listing, or tell me what to search for next.`;
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
