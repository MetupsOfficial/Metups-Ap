export function formatResults(results, criteria) {
  if (!results.length) {
    return 'I could not find any matching listings right now. Try a simpler description like "looking for a sofa".';
  }

  const intro = `I found ${results.length} listings for "${criteria.keywords}".`;
  const lines = results.map((item, index) => {
    const price = item.price != null ? `$${item.price}` : 'Price not listed';
    const location = item.location ? `📍 ${item.location}` : '';
    const condition = item.condition ? `🧾 ${item.condition}` : '';
    return `${index + 1}. ${item.title}\n💲 ${price}\n${location}\n${condition}`.trim();
  });

  return [intro, ...lines, 'Reply with 1, 2, or 3 to contact the seller.'].join('\n\n');
}
