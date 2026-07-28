import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchRequest, scoreMatch, matchesCriteria } from '../services/searchService.js';

test('parseSearchRequest extracts budget, location, and keywords', () => {
  const criteria = parseSearchRequest('Looking for a Samsung S21 under $250 in Harare');

  assert.equal(criteria.keywords, 'samsung s21');
  assert.equal(criteria.budget, 250);
  assert.equal(criteria.location, 'harare');
});

test('scoreMatch rewards title match and budget fit', () => {
  const criteria = parseSearchRequest('Looking for a Samsung S21 under $250');
  const result = {
    title: 'Samsung S21',
    description: 'Great phone',
    price: 220,
    location: 'Harare'
  };

  assert.ok(scoreMatch(result, criteria) > 0);
});

test('matchesCriteria filters by budget and location', () => {
  const criteria = parseSearchRequest('Looking for a Samsung S21 under $250 in Harare');
  const matching = {
    title: 'Samsung S21',
    description: 'Great phone',
    price: 220,
    location: 'Harare'
  };
  const tooExpensive = {
    title: 'Samsung S21',
    description: 'Great phone',
    price: 300,
    location: 'Harare'
  };

  assert.equal(matchesCriteria(matching, criteria), true);
  assert.equal(matchesCriteria(tooExpensive, criteria), false);
});
