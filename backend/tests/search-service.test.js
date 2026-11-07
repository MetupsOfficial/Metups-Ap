import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSearchCriteria, normalizeSearchCondition, searchProducts } from '../src/search-service.js';

function createSupabaseQueryMock({ data = [], error = null, publicUrl = null } = {}) {
  const calls = [];
  const query = {
    select(value) { calls.push(['select', value]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    limit(value) { calls.push(['limit', value]); return this; },
    lte(column, value) { calls.push(['lte', column, value]); return this; },
    or(value) { calls.push(['or', value]); return this; },
    order(column, options) { calls.push(['order', column, options]); return this; },
    then(resolve, reject) { return Promise.resolve({ data, error }).then(resolve, reject); },
  };
  return {
    calls,
    supabase: {
      from(table) { calls.push(['from', table]); return query; },
      storage: {
        from(bucket) {
          calls.push(['storage.from', bucket]);
          return { getPublicUrl(path) { calls.push(['getPublicUrl', path]); return { data: { publicUrl } }; } };
        },
      },
    },
  };
}

test('buildSearchCriteria accepts only compact validated marketplace filters', () => {
  assert.deepEqual(buildSearchCriteria({ category: ' Laptop ', budget_max: 300, location: ' Harare ', condition: 'Like New' }), {
    category: 'laptop', budgetMax: 300, location: 'harare', condition: 'Like-New',
  });
  assert.deepEqual(buildSearchCriteria({ category: '', budget_max: -1, location: null, condition: 9 }), {
    category: null, budgetMax: null, location: null, condition: null,
  });
});

test('missing budget values remain null while numeric zero remains valid', () => {
  for (const budget_max of [null, undefined, '', '   ', 'invalid', -1, Infinity, {}, []]) {
    assert.equal(buildSearchCriteria({ budget_max }).budgetMax, null);
  }
  assert.equal(buildSearchCriteria({ budget_max: 0 }).budgetMax, 0);
  assert.equal(buildSearchCriteria({ budget_max: 100 }).budgetMax, 100);
  assert.equal(buildSearchCriteria({ budget_max: '100' }).budgetMax, 100);
});

test('conditions normalize only to the canonical marketplace values', () => {
  assert.equal(normalizeSearchCondition('brand new'), 'New');
  assert.equal(normalizeSearchCondition('Like New'), 'Like-New');
  assert.equal(normalizeSearchCondition('second-hand'), 'Fair');
  assert.equal(normalizeSearchCondition('pre-owned'), 'Fair');
  assert.equal(normalizeSearchCondition('needs repair'), 'Needs Repair');
  assert.equal(normalizeSearchCondition('Good'), null);
  assert.equal(buildSearchCriteria({ condition: 'used' }).condition, 'Fair');
});

test('searchProducts queries both location representations with active, available filters', async () => {
  const { supabase, calls } = createSupabaseQueryMock();
  await searchProducts(supabase, {
    category: 'laptop', budgetMax: 300, location: 'harare', condition: 'Fair',
  });

  assert.deepEqual(calls.filter(([method]) => method === 'eq'), [
    ['eq', 'is_active', true],
    ['eq', 'sold', false],
    ['eq', 'condition', 'Fair'],
  ]);
  assert.deepEqual(calls.filter(([method]) => method === 'or').map(([, value]) => value), [
    'location.ilike.%harare%,city_name.ilike.%harare%',
    'title.ilike.%laptop%,description.ilike.%laptop%,category.ilike.%laptop%',
  ]);
  assert.deepEqual(calls.find(([method]) => method === 'lte'), ['lte', 'price', 300]);
});

test('searchProducts maps seller phone and only returns public HTTPS image URLs', async () => {
  const { supabase, calls } = createSupabaseQueryMock({
    publicUrl: 'https://project.supabase.co/storage/v1/object/public/product_images/laptop.jpg',
    data: [{
      id: 'listing-1',
      seller: { phone: '263784617009' },
      product_images: [{ image_url: 'listings/laptop.jpg' }],
    }, {
      id: 'listing-2',
      seller: { phone: null },
      product_images: [{ image_url: 'http://not-safe.example/image.jpg' }],
    }],
  });

  const products = await searchProducts(supabase, {
    category: null, budgetMax: null, location: null, condition: null,
  });

  assert.equal(products[0].seller_phone, '263784617009');
  assert.equal(products[0].image_url, 'https://project.supabase.co/storage/v1/object/public/product_images/laptop.jpg');
  assert.equal(products[1].seller_phone, null);
  assert.equal(products[1].image_url, null);
  assert.deepEqual(calls.filter(([method]) => method === 'getPublicUrl'), [['getPublicUrl', 'listings/laptop.jpg']]);
});
