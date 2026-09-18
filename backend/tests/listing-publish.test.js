import assert from 'node:assert/strict';
import test from 'node:test';
import { publishWhatsappListing, validateListingDraft } from '../src/listing-service.js';

const validDraft = {
  title: 'iPhone 13', category: 'Electronics', mediaIds: ['media-1'],
  condition: 'Like-New', price: 300, location: 'Harare', description: '',
};

test('WhatsApp listing publication accepts the website listing contract', () => {
  assert.equal(validateListingDraft(validDraft), null);
});

test('WhatsApp listing publication refuses drafts without images or a valid category', () => {
  assert.match(validateListingDraft({ ...validDraft, mediaIds: [] }), /images/i);
  assert.match(validateListingDraft({ ...validDraft, category: 'Phones' }), /category/i);
});

test('WhatsApp publication reuses the products table and product_images storage paths', async () => {
  const calls = { products: [], images: [], uploads: [], mediaUrls: [] };
  const supabase = {
    from(table) {
      if (table === 'products') return {
        insert(row) {
          calls.products.push(row);
          return { select: () => ({ single: async () => ({ data: { id: 'product-1' }, error: null }) }) };
        },
        update() { return { eq: async () => ({ error: null }) }; },
      };
      if (table === 'product_images') return {
        insert(row) { calls.images.push(row); return Promise.resolve({ error: null }); },
      };
      throw new Error(`unexpected table ${table}`);
    },
    storage: { from() { return {
      upload: async (path, blob, options) => {
        calls.uploads.push({ path, size: blob.size, options });
        return { error: null };
      },
      remove: async () => ({ error: null }),
    }; } },
  };
  const fetchImpl = async (url) => {
    calls.mediaUrls.push(url);
    if (String(url).includes('graph.facebook.com')) {
      return new Response(JSON.stringify({ url: 'https://media.example/image-1', mime_type: 'image/png' }), { status: 200 });
    }
    return new Response(new Blob(['image']), { status: 200, headers: { 'content-type': 'image/png' } });
  };

  const result = await publishWhatsappListing(supabase, validDraft, 'profile-1', { WHATSAPP_TOKEN: 'test-token' }, { fetch: fetchImpl });

  assert.equal(result.productId, 'product-1');
  assert.equal(calls.products[0].seller_id, 'profile-1');
  assert.equal(calls.products[0].shipping_available, false);
  assert.equal(calls.products[0].source, 'whatsapp');
  assert.deepEqual(calls.images, [{ product_id: 'product-1', image_url: 'users/profile-1/product-1/whatsapp-1.png', image_order: 0 }]);
  assert.equal(calls.uploads[0].options.contentType, 'image/png');
});
