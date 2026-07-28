export function formatResults(results, criteria) {
  if (!results.length) {
    return 'I could not find any matching listings right now. Try a simpler description like "looking for a sofa".';
  }

  const intro = `I found ${results.length} listings for "${criteria.keywords}".`;
  const lines = results.map((item, index) => {
    const price = item.price != null ? `$${item.price}` : 'Price not listed';
    const location = item.location ? `📍 ${item.location}` : '';
    return `${index + 1}. ${item.title}\n💲 ${price}\n${location}`.trim();
  });

  return [intro, ...lines].join('\n\n');
}
