import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCarouselPayload, buildSingleListingPayload, contactLink, formatGreeting, formatHelp, formatResults, formatSearchCancelled, formatSelectedProduct, formatSellerWebsiteRedirect, formatUnknownRequest, toWaNumber } from '../utils/formatter.js';

test('toWaNumber normalizes Zimbabwean phone formats', () => {
  for (const input of ['0784617009', '+263784617009', '263784617009', '784617009', '078 461 7009']) {
    assert.equal(toWaNumber(input), '263784617009');
  }
});

test('single listing builder matches CTA URL shape and omits an absent image header', () => {
  const listing = { title: 'Laptop', price: 300, condition: 'Good', city: 'Harare', seller_phone: '0784617009' };
  const payload = buildSingleListingPayload('263700000000', listing);
  assert.deepEqual(payload, {
    messaging_product: 'whatsapp', to: '263700000000', type: 'interactive',
    interactive: {
      type: 'cta_url', body: { text: '*Laptop*\n$300 · Good\n📍 Harare' },
      action: { name: 'cta_url', parameters: { display_text: 'Contact seller', url: contactLink(listing) } },
    },
  });

  const withImage = buildSingleListingPayload('263700000000', { ...listing, image_url: 'https://cdn.metups.com/laptop.jpg' });
  assert.deepEqual(withImage.interactive.header, { type: 'image', image: { link: 'https://cdn.metups.com/laptop.jpg' } });
});

test('carousel builder matches card shape and uses placeholder images for missing photos', () => {
  const listings = [
    { title: 'Phone', price: 200, condition: 'Used', city: 'Harare', seller_phone: '0784617009' },
    { title: 'Tablet', price: 150, condition: 'Good', city: 'Bulawayo', seller_phone: '0784617009', image_url: 'https://cdn.metups.com/tablet.jpg' },
  ];
  const payload = buildCarouselPayload('263700000000', listings, 'https://cdn.metups.com/placeholder.jpg');
  assert.deepEqual(payload, {
    messaging_product: 'whatsapp', to: '263700000000', type: 'interactive',
    interactive: {
      type: 'carousel', body: { text: 'Found 2 matches. Swipe to browse' },
      action: { cards: listings.map((listing, card_index) => ({
        card_index, type: 'cta_url',
        header: { type: 'image', image: { link: listing.image_url || 'https://cdn.metups.com/placeholder.jpg' } },
        body: { text: `*${listing.title}*\n$${listing.price} · ${listing.condition}\n📍 ${listing.city}` },
        action: { name: 'cta_url', parameters: { display_text: 'Contact seller', url: contactLink(listing) } },
      })) },
    },
  });
});

test('formatResults includes a selection prompt for the next step', () => {
  const message = formatResults([
    { title: 'Samsung S21', price: 220, location: 'Harare', seller: { rating_avg: 4.8, rating_count: 12, phone_verified: true } }
  ], { category: 'samsung s21' });

  assert.match(message, /Reply with a number/i);
  assert.match(message, /1️⃣/);
  assert.match(message, /4\.8 \(12 reviews\)/);
  assert.match(message, /Phone verified/);
});

test('formatResults gives zero-result searches a clear next action', () => {
  const message = formatResults([], { category: 'laptop', budgetMax: 300 });

  assert.match(message, /No matches/i);
  assert.match(message, /higher budget/i);
});

test('selected product reply includes a direct share link and report action', () => {
  const message = formatSelectedProduct(
    { title: 'Samsung S21', price: 220, seller: { full_name: 'Tendai' } },
    'https://metups.com/features/products/product.html?id=p-1',
    'https://wa.me/263784617009?text=hello',
  );
  assert.match(message, /https:\/\/metups\.com\/features\/products\/product\.html\?id=p-1/);
  assert.match(message, /https:\/\/wa\.me\/263784617009/);
  assert.match(message, /REPORT/i);
});

test('seller requests receive the existing website listing route', () => {
  assert.match(formatSellerWebsiteRedirect('https://metups.com/'), /https:\/\/metups\.com\/features\/products\/add_product\.html/);
});

test('basic buyer replies provide a next action', () => {
  for (const response of [formatGreeting(), formatHelp(), formatSearchCancelled(), formatUnknownRequest()]) {
    assert.ok(response.length > 20);
  }
});
