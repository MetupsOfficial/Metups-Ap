import { scoreMatch } from './searchService.js';

export function rankResults(items, criteria) {
  return items
    .map(item => ({ ...item, score: scoreMatch(item, criteria) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
